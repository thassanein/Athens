// EVRO Enterprise Symbols (6C.1) — the eight system glyphs: Energy, Momentum,
// Weather, Value, Missions, AI, Seasons, Achievement. Same idiom as Icons.jsx
// (24-grid, currentColor, 2px round stroke) but each echoes the brand's
// orbital-pulse language: arcs sweep, sparks lead NE, cores hold the centre.
// Colour by context via the --brand-* tokens (see index.css).

const S = ({ children, size = 18 }) => (
  <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)

// Energy — the pulse orbital in miniature: arc open NE, core, spark.
export const SymEnergy = ({ size }) => (
  <S size={size}><path d="M16.9 16.9A7 7 0 1 1 16.9 7.1" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18.5" cy="5.5" r="1.6" fill="currentColor" stroke="none" /></S>
)

// Momentum — ascent with trailing wake.
export const SymMomentum = ({ size }) => (
  <S size={size}><path d="M5 19L19 5" /><path d="M12 5h7v7" /><path d="M4 13l3 3" /><path d="M8 9l2 2" /></S>
)

// Weather — the operating sky: sun edge behind a front.
export const SymWeather = ({ size }) => (
  <S size={size}><path d="M17 9a4 4 0 1 0-7.4-2" /><path d="M6 14a3.5 3.5 0 0 0 0 7h10a4 4 0 1 0-1-7.87A5 5 0 0 0 6 14z" /></S>
)

// Value — the faceted asset.
export const SymValue = ({ size }) => (
  <S size={size}><path d="M7 3h10l4 6-9 12L3 9z" /><path d="M3 9h18" /><path d="M12 21L8.5 9l2-6" /><path d="M12 21L15.5 9l-2-6" /></S>
)

// Missions — the target, locked.
export const SymMission = ({ size }) => (
  <S size={size}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></S>
)

// AI — the orbital mind: core with one inclined orbit and its node.
export const SymAI = ({ size }) => (
  <S size={size}><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-24 12 12)" /><circle cx="19" cy="7.4" r="1.4" fill="currentColor" stroke="none" /></S>
)

// Seasons — the year's wheel, one quarter live.
export const SymSeason = ({ size }) => (
  <S size={size}><circle cx="12" cy="12" r="8" /><path d="M12 4v8h8" /><path d="M12 12v8a8 8 0 0 0 5.66-2.34z" fill="currentColor" stroke="none" /></S>
)

// Achievement — the summit standard.
export const SymAchievement = ({ size }) => (
  <S size={size}><circle cx="12" cy="9" r="5" /><path d="M9.5 13.5L8 21l4-2.4L16 21l-1.5-7.5" /><circle cx="12" cy="9" r="1.4" fill="currentColor" stroke="none" /></S>
)

export const SYMBOLS = [
  { key: 'energy', label: 'Energy', Sym: SymEnergy, token: '--brand-energy', meaning: 'How alive the enterprise is — the pulse orbital in miniature.' },
  { key: 'momentum', label: 'Momentum', Sym: SymMomentum, token: '--brand-momentum', meaning: 'Direction and rate — ascent with a wake.' },
  { key: 'weather', label: 'Weather', Sym: SymWeather, token: '--brand-caution', meaning: 'Operating conditions — read before you fly.' },
  { key: 'value', label: 'Value', Sym: SymValue, token: '--brand-value', meaning: 'The asset itself — faceted, validated, banked.' },
  { key: 'missions', label: 'Missions', Sym: SymMission, token: '--brand-risk', meaning: 'What needs a human — the target, locked.' },
  { key: 'ai', label: 'AI', Sym: SymAI, token: '--brand-ai', meaning: 'The orbital mind — deterministic, visible, on duty.' },
  { key: 'seasons', label: 'Seasons', Sym: SymSeason, token: '--brand-intelligence', meaning: 'The year’s wheel — one quarter always live.' },
  { key: 'achievement', label: 'Achievement', Sym: SymAchievement, token: '--brand-energy', meaning: 'The summit standard — provable, dated, kept.' },
]
