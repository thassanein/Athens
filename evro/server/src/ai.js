// EVRO AI (phase-1 spike) — an OPTIONAL real-LLM answer path for the copilot.
//
// Design guarantees:
//  • Off by default. With no ANTHROPIC_API_KEY the SDK is never even imported;
//    the endpoint reports {enabled:false} and the client falls back to the
//    deterministic copilot. Keyless / open mode is completely unaffected.
//  • Grounded. The client sends a compact JSON snapshot of the portfolio (the
//    same numbers the UI shows); the system prompt forbids inventing figures.
//    So answers stay honest — Claude reasons and explains, the numbers are ours.
//  • Metered. A per-process daily call cap (AI_DAILY_CAP, default 200) plus a
//    cheap default model (AI_MODEL, default Haiku) keep spend small and bounded.
//  • Guarded. The spend endpoint is origin-locked to this app + per-IP hourly
//    capped, so the public host can't be used to drain the key from another
//    site or a script (see spend guards below). Optional shared token too.
//
// This is the reasoning layer ON TOP of the deterministic engine, not a
// replacement for it. Tool-use grounding (Claude calling the view helpers
// itself) is the phase-2 upgrade.

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY
const MODEL = () => process.env.AI_MODEL || 'claude-haiku-4-5'
const DAILY_CAP = () => Number(process.env.AI_DAILY_CAP || 200)
const IP_HOURLY_CAP = () => Number(process.env.AI_IP_HOURLY || 40)
const ACCESS_TOKEN = () => process.env.AI_ACCESS_TOKEN || '' // optional shared secret
const EXTRA_ORIGINS = () => (process.env.AI_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
const MAX_CONTEXT_CHARS = 60000 // ~15k tokens — plenty for the whole book, bounds cost

// In-process usage meter (resets each UTC day). Good enough for a spike / single
// dyno; swap for a shared store if you scale out.
let _day = null
let _count = 0
function meter() {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== _day) { _day = today; _count = 0 }
  return { used: _count, cap: DAILY_CAP(), remaining: Math.max(0, DAILY_CAP() - _count) }
}

// ---- spend guards -----------------------------------------------------------
// The endpoint is reachable on the public host, so a real key must not be a
// free-for-all. Three cheap, in-process checks bound abuse without any config:
//   1. Origin-lock — only this app's own origin (or a non-browser caller with no
//      Origin, e.g. curl) may spend. Other websites are refused, so the open
//      CORS policy can't be used to drain the key cross-site.
//   2. Per-IP hourly cap — one source can't burn the whole daily allowance.
//   3. Optional shared token (AI_ACCESS_TOKEN) — belt-and-suspenders if set.

// A same-origin browser POST carries Origin === the app's own origin; curl and
// server-to-server callers carry none. Other websites carry a foreign Origin.
function originOK(req) {
  const origin = req.headers.origin
  if (!origin) return true // non-browser (curl / server-to-server) — still IP-capped
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const self = [`https://${host}`, `http://${host}`]
  return self.includes(origin) || EXTRA_ORIGINS().includes(origin)
}

function tokenOK(req) {
  const need = ACCESS_TOKEN()
  if (!need) return true // not configured → skip this layer
  return (req.headers['x-evro-ai-token'] || '') === need
}

// Sliding 1h per-IP counter. Cleaned lazily; fine for a single dyno.
const _ipHits = new Map() // ip -> number[] (ms timestamps)
function rateOK(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  const now = Date.now()
  const cutoff = now - 60 * 60 * 1000
  const hits = (_ipHits.get(ip) || []).filter((t) => t > cutoff)
  if (hits.length >= IP_HOURLY_CAP()) { _ipHits.set(ip, hits); return false }
  hits.push(now)
  _ipHits.set(ip, hits)
  if (_ipHits.size > 5000) { for (const [k, v] of _ipHits) { if (!v.some((t) => t > cutoff)) _ipHits.delete(k) } }
  return true
}

const SYSTEM = `You are EVRO, the Athens Services procurement copilot. You help procurement leaders and executives understand the savings portfolio.

Rules — follow exactly:
- Answer ONLY from the PORTFOLIO CONTEXT provided below. Never invent, estimate, or extrapolate a number that isn't in it.
- If the answer isn't in the context, say so plainly ("I don't have that in the current data") — do not guess.
- Cite the specific deal name or metric behind every figure you give.
- Plain business language. No jargon, no procurement acronyms unless you define them. Short.
- Money is in USD. Do the arithmetic only across numbers that are in the context.
- You are a read-only analyst: explain, compare, rank, summarize. Don't claim to have changed anything.`

// Verify the SDK actually loads (cached). "enabled" should mean "will work",
// not just "a key is set" — otherwise the UI claims EVRO AI then silently falls
// back when the package is missing. Checked once and remembered.
let _sdkOk = null
async function sdkLoadable() {
  if (_sdkOk !== null) return _sdkOk
  try { await import('@anthropic-ai/sdk'); _sdkOk = true }
  catch { _sdkOk = false }
  return _sdkOk
}

// GET /api/ai/status — the client uses this to decide AI vs deterministic.
export async function aiStatus(_req, res) {
  const ready = aiEnabled() && (await sdkLoadable())
  res.json({ enabled: ready, model: ready ? MODEL() : null, ...meter() })
}

// GET /api/ai/selftest — one-click browser diagnostic. Walks the exact path an
// answer takes and reports which stage fails, so a non-technical user can just
// open the URL and share the JSON. Rate-limited; makes one tiny (~10-token) call.
export async function aiSelftest(req, res) {
  const out = { keyPresent: aiEnabled(), model: MODEL() }
  if (!aiEnabled()) return res.json({ ...out, ok: false, stage: 'key', hint: 'ANTHROPIC_API_KEY is not set on the server.' })
  if (!rateOK(req)) return res.status(429).json({ ...out, ok: false, stage: 'rate', hint: 'Too many tests from this IP; wait an hour.' })
  let Anthropic
  try { ({ default: Anthropic } = await import('@anthropic-ai/sdk')) }
  catch (err) { return res.json({ ...out, ok: false, stage: 'sdk', error: String(err?.message || err), hint: 'The @anthropic-ai/sdk package is not installed on the server.' }) }
  try {
    const client = new Anthropic()
    const resp = await client.messages.create({ model: MODEL(), max_tokens: 16, messages: [{ role: 'user', content: 'Reply with exactly: ok' }] })
    const reply = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
    res.json({ ...out, ok: true, stage: 'done', reply, usage: { input: resp.usage?.input_tokens ?? null, output: resp.usage?.output_tokens ?? null } })
  } catch (err) {
    const status = err?.status || err?.statusCode
    res.json({ ...out, ok: false, stage: 'api', status: status ?? null, error: String(err?.message || err),
      hint: status === 401 ? 'The API key is invalid.' : status === 400 ? 'Bad request (likely a wrong model name).' : status === 429 ? 'Anthropic rate/credit limit — check billing/credits.' : 'The call to Anthropic failed.' })
  }
}

// POST /api/ai/ask  { question, context }  →  { enabled, answer, model, usage }
export async function aiAsk(req, res) {
  if (!aiEnabled()) return res.json({ enabled: false })
  // Spend guards: only this app may call, and no single source can drain the key.
  if (!originOK(req)) return res.status(403).json({ enabled: true, error: 'origin' })
  if (!tokenOK(req)) return res.status(403).json({ enabled: true, error: 'forbidden' })
  if (!rateOK(req)) return res.status(429).json({ enabled: true, error: 'rate' })

  const question = String(req.body?.question || '').trim()
  const context = req.body?.context
  if (!question) return res.status(400).json({ enabled: true, error: 'no_question' })
  if (question.length > 2000) return res.status(400).json({ enabled: true, error: 'question_too_long' })

  const m = meter()
  if (m.remaining <= 0) return res.status(429).json({ enabled: true, error: 'cap', ...m })

  let contextStr = ''
  try { contextStr = typeof context === 'string' ? context : JSON.stringify(context) } catch { contextStr = '' }
  if (contextStr.length > MAX_CONTEXT_CHARS) contextStr = contextStr.slice(0, MAX_CONTEXT_CHARS)

  try {
    // Lazy import — only loaded when a key is present, so the package is not a
    // hard dependency of the keyless build.
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic() // reads ANTHROPIC_API_KEY
    _count++ // count the attempt (so a cap can't be bypassed by errors)

    const resp = await client.messages.create({
      model: MODEL(),
      max_tokens: 1024,
      system: [
        { type: 'text', text: SYSTEM },
        // The portfolio snapshot is stable across a session's questions — cache it.
        { type: 'text', text: `PORTFOLIO CONTEXT (the only source of truth):\n${contextStr}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: question }],
    })

    const answer = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    res.json({
      enabled: true,
      answer: answer || 'No answer.',
      model: resp.model || MODEL(),
      usage: { input: resp.usage?.input_tokens ?? null, output: resp.usage?.output_tokens ?? null,
        cacheRead: resp.usage?.cache_read_input_tokens ?? null },
      ...meter(),
    })
  } catch (err) {
    console.error('[ai] ask failed:', err?.message || err)
    res.status(502).json({ enabled: true, error: 'ai_error', detail: String(err?.message || err) })
  }
}
