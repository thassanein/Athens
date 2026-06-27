// Authentication — Microsoft Entra (Azure AD) OpenID Connect, auth-code + PKCE.
//
// Two modes:
//   - SECURE: when ENTRA_CLIENT_ID/TENANT_ID/CLIENT_SECRET/REDIRECT_URI are set,
//     users must sign in with Microsoft; /api is protected; role comes from the
//     token's app roles or an email allowlist.
//   - OPEN: when those are NOT set (local dev / the Pages demo has no server at
//     all), the server returns a default dev user so the app keeps working.
import cookieSession from 'cookie-session'
import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node'

const {
  ENTRA_CLIENT_ID,
  ENTRA_TENANT_ID,
  ENTRA_CLIENT_SECRET,
  ENTRA_REDIRECT_URI,
  AUDITOR_EMAILS = '',
  DEFAULT_ROLE = 'viewer',
  SESSION_SECRET,
  NODE_ENV,
} = process.env

export const authEnabled = Boolean(
  ENTRA_CLIENT_ID && ENTRA_TENANT_ID && ENTRA_CLIENT_SECRET && ENTRA_REDIRECT_URI
)
const PROD = NODE_ENV === 'production'

// Safety: in production, refuse to run "open" (no-auth) — that would expose the
// database. Until Entra is configured, /api and /auth/me return 503 so the live
// site falls back to read-only demo data instead of leaking real records.
const UNCONFIGURED = PROD && !authEnabled
if (UNCONFIGURED) {
  console.warn('[auth] PRODUCTION WITHOUT ENTRA CONFIG — API is locked (503). Set ENTRA_* env vars.')
}

const SCOPES = ['openid', 'profile', 'email']

// Default identity used in OPEN mode (local dev only).
const DEV_USER = { name: 'Dave Marin', email: 'dev@local', role: 'auditor', initials: 'DM' }

const auditorList = AUDITOR_EMAILS.toLowerCase()
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function initialsFrom(name = '') {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'A'
}

// App roles in the token win; otherwise the email allowlist; otherwise default.
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
if (authEnabled) {
  cca = new ConfidentialClientApplication({
    auth: {
      clientId: ENTRA_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}`,
      clientSecret: ENTRA_CLIENT_SECRET,
    },
  })
  cryptoProvider = new CryptoProvider()
}

// Signed session cookie. Holds the user identity (and transient PKCE during the
// login round-trip). secure+sameSite work because the app is single-origin.
export const sessionMiddleware = cookieSession({
  name: 'athens.sid',
  keys: [SESSION_SECRET || 'dev-insecure-change-me'],
  maxAge: 8 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: NODE_ENV === 'production',
})

function safeRedirect(target) {
  // only allow same-app relative paths
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

export function mountAuthRoutes(app) {
  // Who am I? Drives the frontend (authed / needs-login / demo).
  app.get('/auth/me', (req, res) => {
    if (UNCONFIGURED) return res.status(503).json({ error: 'auth not configured', mode: 'unconfigured' })
    if (!authEnabled) return res.json({ ...DEV_USER, mode: 'open' }) // local dev only
    if (req.session?.user) return res.json({ ...req.session.user, mode: 'sso' })
    return res.status(401).json({ error: 'not authenticated', mode: 'sso' })
  })

  if (!authEnabled) return // OPEN mode: no login routes needed

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
    // Also end the Microsoft session, then return to the app.
    const base = ENTRA_REDIRECT_URI.replace(/\/auth\/redirect$/, '/')
    const logoutUrl =
      `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/oauth2/v2.0/logout` +
      `?post_logout_redirect_uri=${encodeURIComponent(base)}`
    res.redirect(logoutUrl)
  })
}

// Gate for /api. OPEN mode injects the dev user; SECURE mode requires a session.
export function requireAuth(req, res, next) {
  if (UNCONFIGURED) return res.status(503).json({ error: 'auth not configured' })
  if (!authEnabled) {
    req.user = DEV_USER // local dev only
    return next()
  }
  if (req.session?.user) {
    req.user = req.session.user
    return next()
  }
  return res.status(401).json({ error: 'authentication required' })
}

// Write-protection: only auditors may edit existing records (defense in depth —
// the UI already hides the controls for viewers).
export function requireAuditor(req, res, next) {
  if (req.user?.role === 'auditor') return next()
  return res.status(403).json({ error: 'auditor role required' })
}
