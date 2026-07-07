// 6D experience flags — client-side, localStorage-backed. Risky new
// experiences ship behind a flag so they can be dark-launched and toggled
// without any data-model or engine change (the guardrail). This is a
// PRESENTATION switch only; it never gates value math or the deterministic
// record — those always run.
const KEY = 'evro.flags.v1'

// default:false flags are dark-launched; default:true are on but reversible.
export const EXPERIENCE_FLAGS = [
  { key: 'execWeather', label: 'Executive weather states', desc: 'Stable / Opportunity / Watch / Volatile / Critical over the weather engine.', default: true },
  { key: 'narrative', label: 'Executive narrative mode', desc: 'What happened / why / what it means / what next, with evidence drill-through.', default: true },
  { key: 'execMemory', label: 'Executive memory', desc: 'Transparent, editable preference layer — remembers views, depth, focus mode.', default: true },
  { key: 'focusModes', label: 'Executive focus modes', desc: 'CEO / CFO / COO / … reorder and emphasise; they never fork the product.', default: true },
  { key: 'aiShadow', label: 'AI shadow mode', desc: 'AI observes silently; proactive recommendations stay suppressed until enabled.', default: false },
]
const DEFAULTS = Object.fromEntries(EXPERIENCE_FLAGS.map((f) => [f.key, f.default]))

function read() {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) }
  } catch { return { ...DEFAULTS } }
}
function write(state) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode */ }
}

export function readFlags() { return read() }
export function flagOn(key) { return read()[key] ?? DEFAULTS[key] ?? false }
export function setFlag(key, on) { const s = read(); s[key] = !!on; write(s); return s }
export function resetFlags() { write({ ...DEFAULTS }); return { ...DEFAULTS } }
