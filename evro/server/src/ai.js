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
//
// This is the reasoning layer ON TOP of the deterministic engine, not a
// replacement for it. Tool-use grounding (Claude calling the view helpers
// itself) is the phase-2 upgrade.

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY
const MODEL = () => process.env.AI_MODEL || 'claude-haiku-4-5'
const DAILY_CAP = () => Number(process.env.AI_DAILY_CAP || 200)
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

const SYSTEM = `You are EVRO, the Athens Services procurement copilot. You help procurement leaders and executives understand the savings portfolio.

Rules — follow exactly:
- Answer ONLY from the PORTFOLIO CONTEXT provided below. Never invent, estimate, or extrapolate a number that isn't in it.
- If the answer isn't in the context, say so plainly ("I don't have that in the current data") — do not guess.
- Cite the specific deal name or metric behind every figure you give.
- Plain business language. No jargon, no procurement acronyms unless you define them. Short.
- Money is in USD. Do the arithmetic only across numbers that are in the context.
- You are a read-only analyst: explain, compare, rank, summarize. Don't claim to have changed anything.`

// GET /api/ai/status — the client uses this to decide AI vs deterministic.
export function aiStatus(_req, res) {
  res.json({ enabled: aiEnabled(), model: aiEnabled() ? MODEL() : null, ...meter() })
}

// POST /api/ai/ask  { question, context }  →  { enabled, answer, model, usage }
export async function aiAsk(req, res) {
  if (!aiEnabled()) return res.json({ enabled: false })
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
