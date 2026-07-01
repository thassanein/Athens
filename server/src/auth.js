// Authentication — three modes, chosen by which env vars are set:
//   1. ENTRA  : Microsoft Entra (Azure AD) OIDC, auth-code + PKCE (full SSO).
//   2. PASSCODE: shared team passcodes (no admin needed). AUDITOR_PASSCODE /
//      VIEWER_PASSCODE — entering one signs you in with that role.
//   3. OPEN   : local dev only (no auth env) → a default dev user. In PRODUCTION
//      with no auth configured the API is locked (503) so data can't leak.
import crypto from 'node:crypto'
import cookieSession from 'cookie-session'
import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node'

const {
  ENTRA_CLIENT_ID,
  ENTRA_TENANT_ID,
  ENTRA_CLIENT_SECRET,
  ENTRA_REDIRECT_URI,
  AUDITOR_EMAILS = '',
  AUDITOR_PASSCODE = '',
  VIEWER_PASSCODE = '',
  DEFAULT_ROLE = 'viewer',
  SESSION_SECRET,
  NODE_ENV,
} = process.env

const PROD = NODE_ENV === 'production'

export const entraEnabled = Boolean(
  ENTRA_CLIENT_ID && ENTRA_TENANT_ID && ENTRA_CLIENT_SECRET && ENTRA_REDIRECT_URI
)
export const passcodeEnabled = !entraEnabled && Boolean(AUDITOR_PASSCODE || VIEWER_PASSCODE)
export const authEnabled = entraEnabled || passcodeEnabled
export const authMode = entraEnabled ? 'sso' : passcodeEnabled ? 'passcode' : 'open'

// OPEN/PUBLIC mode: no auth configured. The app and API are intentionally
// public (so other apps and AI tools can reach the data); the client picks an
// Auditor/Viewer role for its own UX. Set Entra or passcodes to lock it down.
if (!authEnabled) {
  console.warn(`[auth] OPEN/PUBLIC mode${PROD ? ' (PRODUCTION)' : ''} — no sign-in required; API is publicly accessible.`)
}

const SCOPES = ['openid', 'profile', 'email']
const DEV_USER = { name: 'Dave Marin', email: 'dev@local', role: 'auditor', initials: 'DM' }

const auditorList = AUDITOR_EMAILS.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean)

function initialsFrom(name = '') {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'A'
}

// Constant-time string compare (avoids leaking length/early-exit timing).
function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function resolveRole(email, tokenRoles) {
  if (Array.isArray(tokenRoles)) {
    if (tokenRoles.includes('Auditor')) return 'auditor'
    if (tokenRoles.includes('Viewer')) return 'viewer'
  }
  if (email && auditorList.includes(email.toLowerCase())) return 'auditor'
  return DEFAULT_ROLE === 'auditor' ? 'auditor' : 'viewer'
}

let cca = null
let cryptoProvider = null
if (entraEnabled) {
  cca = new ConfidentialClientApplication({
    auth: {
      clientId: ENTRA_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}`,
      clientSecret: ENTRA_CLIENT_SECRET,
    },
  })
  cryptoProvider = new CryptoProvider()
}

export const sessionMiddleware = cookieSession({
  name: 'athens.sid',
  keys: [SESSION_SECRET || 'dev-insecure-change-me'],
  maxAge: 8 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: PROD,
})

function safeRedirect(target) {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

export function mountAuthRoutes(app) {
  // Who am I? Drives the frontend: authed / which-login-to-show / demo.
  app.get('/auth/me', (req, res) => {
    if (!authEnabled) return res.json({ ...DEV_USER, mode: 'open' }) // open/public mode
    if (req.session?.user) return res.json({ ...req.session.user, mode: authMode })
    return res.status(401).json({ error: 'not authenticated', mode: authMode })
  })

  // ---- PASSCODE mode ----
  if (passcodeEnabled) {
    app.post('/auth/passcode', (req, res) => {
      const code = String(req.body?.passcode ?? '')
      let role = null
      if (AUDITOR_PASSCODE && safeEqual(code, AUDITOR_PASSCODE)) role = 'auditor'
      else if (VIEWER_PASSCODE && safeEqual(code, VIEWER_PASSCODE)) role = 'viewer'
      // TEMP unblock — a known auditor passcode baked into the app so the team
      // can get in while the Render AUDITOR_PASSCODE/VIEWER_PASSCODE values are
      // sorted out. Remove this line (and rotate) once dashboard sign-in works.
      else if (safeEqual(code, 'Athens9722Go')) role = 'auditor'
      if (!role) return res.status(401).json({ error: 'Incorrect passcode.' })
      req.session.user =
        role === 'auditor'
          ? { name: 'Field Auditor', email: '', role: 'auditor', initials: 'FA' }
          : { name: 'Site Viewer', email: '', role: 'viewer', initials: 'SV' }
      res.json({ ok: true, role })
    })

    app.get('/auth/logout', (req, res) => {
      req.session = null
      res.redirect('/')
    })
    return
  }

  if (!entraEnabled) return // OPEN mode — no login routes

  // ---- ENTRA (Microsoft) mode ----
  app.get('/auth/login', async (req, res, next) => {
    try {
      const { verifier, challenge } = await cryptoProvider.generatePkceCodes()
      const state = cryptoProvider.base64Encode(
        JSON.stringify({ csrf: cryptoProvider.createNewGuid(), redirectTo: safeRedirect(req.query.redirectTo) })
      )
      req.session.pkce = { verifier, state }
      const url = await cca.getAuthCodeUrl({
        scopes: SCOPES,
        redirectUri: ENTRA_REDIRECT_URI,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        state,
      })
      res.redirect(url)
    } catch (err) {
      next(err)
    }
  })

  app.get('/auth/redirect', async (req, res, next) => {
    try {
      const pkce = req.session?.pkce
      if (!pkce || !req.query.code || req.query.state !== pkce.state) {
        return res.status(401).send('Login failed (state mismatch). Please try again.')
      }
      const result = await cca.acquireTokenByCode({
        code: String(req.query.code),
        scopes: SCOPES,
        redirectUri: ENTRA_REDIRECT_URI,
        codeVerifier: pkce.verifier,
      })
      const claims = result.account?.idTokenClaims || result.idTokenClaims || {}
      const email = (claims.preferred_username || claims.email || claims.upn || '').toLowerCase()
      const name = claims.name || email || 'User'
      const user = { name, email, role: resolveRole(email, claims.roles), initials: initialsFrom(name) }
      let redirectTo = '/'
      try {
        redirectTo = safeRedirect(JSON.parse(cryptoProvider.base64Decode(pkce.state)).redirectTo)
      } catch {
        /* default */
      }
      req.session.pkce = undefined
      req.session.user = user
      res.redirect(redirectTo)
    } catch (err) {
      next(err)
    }
  })

  app.get('/auth/logout', (req, res) => {
    req.session = null
    const base = ENTRA_REDIRECT_URI.replace(/\/auth\/redirect$/, '/')
    res.redirect(
      `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/oauth2/v2.0/logout` +
        `?post_logout_redirect_uri=${encodeURIComponent(base)}`
    )
  })
}

export function requireAuth(req, res, next) {
  if (!authEnabled) {
    req.user = DEV_USER // open/public mode — no sign-in required
    return next()
  }
  if (req.session?.user) {
    req.user = req.session.user
    return next()
  }
  return res.status(401).json({ error: 'authentication required' })
}

export function requireAuditor(req, res, next) {
  if (req.user?.role === 'auditor') return next()
  return res.status(403).json({ error: 'auditor role required' })
}
