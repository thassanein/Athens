// EVRO Identity Lab — the 6C.1A panel verdict (Wave 3). STATIC EDITORIAL DATA.
// Provenance: a six-judge AI review panel (five identity lenses + one
// landing/mobile lens — model-run persona judges, not human consultants) was
// convened ONCE during Phase 6C.1A and scored the rendered
// artifacts on this page — the direction cards and scale rows, the logo
// systems, the page concepts. Each judge scored independently on the brief's
// success criteria (integers 1-10, instructed to discriminate); the matrix is
// the plain mean of the five identity judges, Borda points come from their
// explicit rankings (1st place = 5 pts ... 5th = 1 pt), and the prose is the
// panel chair's synthesis of the judges' own notes. Nothing here is computed
// from portfolio data and nothing is a live "AI" — it is a recorded judgment,
// kept because an exploration that won't rank its own options isn't one.
// The complete raw panel output (every per-judge score, ranking, note and
// remark) is committed at docs/EVRO_6C1A_panel_result.json — the means are
// independently auditable. Figures the prose quotes are as the artboards
// rendered at panel time. Advisory only: the shipped Pulse Orbital remains
// the production identity.

export const PANEL_CRITERIA = [
  { key: 'recognizable', label: 'Instantly recognizable' },
  { key: 'premium', label: 'Premium & timeless' },
  { key: 'intelligence', label: 'Says enterprise intelligence' },
  { key: 'categoryDefining', label: 'Category-defining' },
]

// ranked by overall mean; the compass/signal tie (5.5) breaks on Borda (17 vs 15)
export const PANEL_MATRIX = [
  { key: 'monogram', recognizable: 8.2, premium: 8.6, intelligence: 4.4, categoryDefining: 6.4, overall: 6.9, borda: 21,
    line: 'The winner on ownability, 16px survival, and boardroom-in-2036 premium — the device and the name are the same asset, with the gold apex as watchmaker\'s restraint — against one sharp dissent: the semantics lens scores it lowest-but-one on intelligence, a handsome crest that says electric vehicles, not enterprise intelligence, until the system around it speaks.' },
  { key: 'compass', recognizable: 5.4, premium: 6.8, intelligence: 6, categoryDefining: 3.8, overall: 5.5, borda: 17,
    line: 'Instrument-grade at hero size with the best small-size recall element on the sheet — the gold needle locked NE reads \'decision taken, heading held\' even at 16px — but brand-strategist and buyer agree the dial-and-needle silhouette is a near-Safari read, and small-size survival of a borrowed form builds Apple\'s equity, not EVRO\'s.' },
  { key: 'signal', recognizable: 5, premium: 5.2, intelligence: 7.6, categoryDefining: 4.2, overall: 5.5, borda: 15,
    line: 'The only mark that actually speaks the category — emitter, propagating fronts, gold contact confirmed, the Palantir register verbatim, and the semantics lens\'s outright winner — but four judges see a rotated Wi-Fi/RSS glyph at 16px, and as the buyer put it, nobody engraves a wireless icon on a boardroom door.' },
  { key: 'pulse', recognizable: 5.6, premium: 7, intelligence: 4.8, categoryDefining: 3.2, overall: 5.1, borda: 12,
    line: 'The best-engineered geometry of the five — disciplined stroke gradation and the only coded sub-24px fallback — but every lens converges on the same verdict: it is Apple Activity trade dress that decays to a generic bullseye at floor, and it collides with the product\'s own ring gauges rather than signing above them.' },
  { key: 'orbit', recognizable: 4, premium: 5, intelligence: 6.2, categoryDefining: 3.6, overall: 4.7, borda: 10,
    line: 'The panel\'s floor as executed: the gold escape trajectory is its one ownable gesture and it carries continuity with the shipped mark, but the 16px tile smears into an illegible blob on both fields, it fights the atom/React register, and the lab itself declined to build it a lockup — choosing it would merely re-ship the Pulse Orbital.' },
]

export const PANEL_JUDGES = [
  { lens: 'Brand strategist — ownability', top: 'monogram' },
  { lens: 'Design craft — the 16px floor', top: 'monogram' },
  { lens: 'Executive buyer — the engraving test', top: 'monogram' },
  { lens: 'Intelligence semantics — what the pixels say', top: 'signal' },
  { lens: 'Product systems — coexistence with the Pulse Rings', top: 'monogram' },
]

export const PANEL_VERDICT = {
  verdict: 'The panel\'s call is the EV Monogram — first on mean (6.9), first on Borda (21), and the top pick of four of five lenses on the grounds that it is the only silhouette EVRO can own outright, still reads "EV" at 16px on both fields, and passes the engraving test. The Compass is the closest challenger (Borda 17), carried by the best small-size recall element on the sheet, but capped by its near-Safari silhouette. The honest caveat comes from the dissenting semantics lens: the monogram is premium but mute — a crest that says nothing about sensing or command, and in 2026 risks reading "electric vehicle" — a positioning drag the naming and system, not the drawing, must absorb.',
  coexistence: 'The monogram result resolves the master-brand question cleanly: letterforms sign the company in a register the product does not already speak, leaving the Pulse Rings undisturbed as the in-product operating language, with the gold apex dot inheriting the value-spark token so brand and telemetry share grammar without sharing form — the exact separation that disqualified pulse and orbit, which would have dissolved into their own gauges.',
}

export const PAGES_VERDICT = {
  landings: [
    { key: 'status', name: 'L1 Enterprise Status First', valueImmediacy: 4, mobile: 7 },
    { key: 'command', name: 'L2 Mission Control First', valueImmediacy: 8, mobile: 5 },
    { key: 'value', name: 'L3 Enterprise Value First', valueImmediacy: 9, mobile: 8 },
  ],
  homes: [
    { key: 'cc', name: 'H1 Executive Command Center', executiveFit: 7, mobile: 4 },
    { key: 'living', name: 'H2 Living Enterprise Dashboard', executiveFit: 6, mobile: 8 },
  ],
  landingPick: 'value', homePick: 'cc',
  landingLine: 'L3 Value First takes the landing: the $23M hero is both the fastest three-second cold read on desktop and the one phone distillation where the number that matters survives intact — L2 explains the product better but drops every dollar figure on mobile and wraps its CTA, while L1 leads with internal vocabulary (\'Stable · Overcast\') instead of a value proposition.',
  homeLine: 'H1 Command Center wins the home on the question that matters — the screen a CEO keeps open — with its vitals-strip → queue → decisions → value-bridge working seat, but its mobile must be rebuilt as a true distillation rather than the current half-empty crop, borrowing H2\'s ring-plus-state status widget, the best mobile artboard in either file.',
}
