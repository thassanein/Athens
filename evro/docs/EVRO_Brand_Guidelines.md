# Athens EVRO — Brand Identity System

Version: 2.0 (Phase 6C.1) · Last updated: 2026-07-06
Supersedes v1.0 (Phase 4A). Everything here is implemented — the living
specimens render on the in-app **Brand** page (Reference → Brand), sourced from
`frontend/src/components/Brand.jsx`, `Symbols.jsx`, `frontend/src/lib/brand.js`,
`frontend/public/favicon.svg` and the tokens in `frontend/src/index.css`.

> EVRO is the **Enterprise Intelligence Operating System**. The brand register:
> Bloomberg's discipline, Palantir's seriousness, Apple's restraint, Mission
> Control's focus, F1's live strategy. Executive, intelligent, elegant, premium,
> strategic, calm, powerful, trustworthy, timeless, modern.

---

## 1. The mark — the Enterprise Pulse Orbital

Three concentric **pulse arcs** — the product's own hero visualization, the
Pulse Ring — swept as an orbital system on a deep-space navy field, with a gold
**value spark** at the head of the outer orbit ascending 45° north-east, and a
solid **core**: the enterprise "now", the validated record everything traces to.

- Field: rounded square (24/100 radius), navy gradient `#0C1626 → #16325A`.
- Arcs: near-white `#EAF1FA`, three orbits (r 14/26/38 on the 100-grid), each
  swept ~264° clockwise; the ~96° gap opens over the NE quadrant.
- Spark: **always gold, always at 45° NE** — value ascends. (The gold *hue* is
  constant; like every accent it darkens for the light theme's contrast.)
- Components: `EvroMark({ size, tile, motion, journey })`,
  `EvroLockup({ size, orientation, sub, variant, motion })`;
  `BrandMark`/`BrandLockup` remain as compatible aliases.

**Variants** — icon-only (tile, or bare glyph on `currentColor`), horizontal
lockup (app chrome), vertical lockup (covers, heroes, welcome), journey variant
(the three arcs take the Investment, Realization and Sustainment stage colours), and **motion** (arcs breathe at 5.2s, spark
pulses at 2.8s — inside `prefers-reduced-motion` guards).

**Rules.** Never decorated, tilted, or recoloured. Icon-only at 16px and up.
Motion only where the enterprise is live (app chrome, landing, welcome). The
spark never moves from NE. Clearspace: half the mark's width on all sides.

## 2. The Pulse Identity decision

**Yes — the Enterprise Pulse Ring is the core visual identity.** One system,
four altitudes: the mark (brand), the Mission Control Pulse Ring (portfolio),
the vitals energy ring (enterprise), the health gauge (score). Meaning: sweep =
progress toward the state's bound; gap = what remains; motion = the enterprise
is live. Rule: rings always render their real values — a decorative ring with a
fake sweep is a brand violation, not a flourish.

## 3. Color — meaning before palette

Semantic tokens (`--brand-*` in `index.css`), themed for dark (default) and
light. Meanings never swap; hues darken for light-mode contrast. Non-text
glyphs must clear WCAG 1.4.11's 3:1 floor in both themes.

| Token | Meaning | Dark | Light |
|---|---|---|---|
| `--brand-value` | validated, banked, compounding | via `--green` | darkened green |
| `--brand-risk` | exposure, escalation, storm | via `--red` | darkened red |
| `--brand-caution` | leakage, weather fronts, watch items | via `--amber` | `#b7791f` |
| `--brand-intelligence` | analysis, forecast, the instrument field | via `--navy` `#4F8DF2` | `#1a428a` |
| `--brand-momentum` | velocity, execution, motion | `#2FB6E0` | `#0b7ba6` |
| `--brand-ai` | the deterministic agent layer | `#8B5CF6` | `#7c3aed` |
| `--brand-energy` | the value spark | `#F5A524` | `#9a6b0a` |

## 4. Typography — the instrument voice

Hierarchy classes in `index.css`; faces are **Archivo** (UI) and **Space Mono**
(data), both with full system fallbacks.

- `.t-display` 34/800 — the number that matters.
- `.t-headline` 21/800 — what happened and why.
- `.t-title` 15/700 — the working level.
- body 13–14 — complete sentences, the honest register.
- `.t-data` / `.mono` — Space Mono, `tabular-nums`; **data always speaks mono**.
- `.t-caption` 11 — provenance and the fine print that keeps us honest.

Evaluation (per the 6C.1 brief): SF Pro — platform-locked; Inter — ubiquitous,
reads generic; Geist — vendor-flavoured. Archivo keeps the grotesque authority
of that class with more character, at zero new network dependencies.

## 5. Motion identity

Motion must mean something. The vocabulary (`.fx-*` — transform and
opacity, with one exception: glow animates box-shadow at low frequency, for
ceremonies only; all inside `prefers-reduced-motion` guards — under reduce,
everything rests):

| Behavior | Meaning | Where |
|---|---|---|
| `fx-breathe` | the living state | energy ring, the mark |
| `fx-pulse` | needs attention | active agent, executive alerts |
| `fx-glow` | a moment honoured | ceremonies, celebrations only |
| `fx-float` | ambient life | ornamental elements, never numbers |
| `fx-rotate` | continuous process | sparingly |
| `fx-expand` | arrival | every entrance |

## 6. Visual language — materials

- **Space**: 8px rhythm; cards on `--r` radius; `.section-gap` between statements.
- **Density**: Bloomberg-dense where data lives (tables, tapes); generous where
  decisions are made (case files, ceremonies).
- **Depth**: flat fields, one shadow level (`--shadow`); glass scrims
  (`rgba(5,7,12,…)` + blur) reserved for overlays and moments.
- **Light**: dark is the cockpit default; light is a first-class instrument
  theme — every accent re-tuned for contrast, print forces light.
- **Gradients**: the brand field and hero washes only; never on data.

## 7. Enterprise symbols

Eight system glyphs (`Symbols.jsx` — 24-grid, `currentColor`, 2px round stroke,
same idiom as the icon set; the `SYMBOLS` registry carries token + meaning):

Energy (the pulse orbital in miniature) · Momentum (ascent with a wake) ·
Weather (the operating sky) · Value (the faceted asset) · Missions (the target,
locked) · AI (the orbital mind) · Seasons (the year's wheel, one quarter live) ·
Achievement (the summit standard).

## 8. Signature moments

Six, all computed live, never staged — three one-time-per-device (first login,
AI discovery, synergy detection) and three recurring rituals: **first login**
(three beats over the real numbers) · **morning briefing** (the COMMAND
BRIEFING stamp with live energy + weather) · **mission completion** (the
ceremony — what was unblocked, the dollar, the journal wrote itself) · **AI
discovery** (the mission replay — once seen, never doubted) · **synergy
detection** (structure, not staging) · **season close** (scores archive,
objectives renew, the record stays).

## 9. The manifesto

*The enterprise is alive. EVRO exists to make that visible — and to help the
people who run it act on what they see.*

**We believe** value is created, not reported; nothing is staged — every number
traces to the operating record; the preparation belongs to the system, the
decision to the human; momentum compounds and so does leakage; trust is earned
by showing your work — confidence stated, evidence attached, dissent retained.

**How we build:** an operating system, not an application — rhythms, rituals,
presence, memory. Calm instruments over loud dashboards. Motion has meaning.
Executive-grade restraint: one refined card, a quiet glow, never confetti.

**Operating principles:** everything communicates state; everything
communicates momentum; progress must be visible; enterprise health must be
intuitive; performance and accessibility are mandatory; honesty is the brand —
proxies are labelled, projections say so, gaps are stated.

**The voice:** declarative and concrete — "the record", "on the books", "the
decision is yours". Numerate: a claim without its number is not finished. Never
hypes, never invents; a coverage gap is stated, not scored. Warm at the moments
that deserve it — a welcome, a milestone, a lesson learned.

## 10. What EVRO is / is not

**Is:** Enterprise Intelligence Operating System · Enterprise Mission Control ·
Enterprise Value Platform · AI Chief of Staff Platform · Behavioral Enterprise
Operating System · Digital Enterprise Twin.

**Is not:** ERP software · BI dashboards · project management software ·
traditional enterprise applications · consumer gamification products.

## 11. Do / Don't (carried from v1, still binding)

- **Do** lead with a real number and its meaning. **Don't** invent targets or fabricate data.
- **Do** keep colour semantic. **Don't** use green for anything unrealized or red for non-alerts.
- **Do** honor reduced-motion. **Don't** block content behind an animation.
- **Do** label AI as rules-based. **Don't** imply a language model.

## 12. Heritage

The v1 mark's four-node ascent (Opportunity → Investment → Realization →
Sustainment) survives in the journey variant — its three arcs carry the
Investment, Realization and Sustainment stage colours; Opportunity purple lives
on in the Brand page's heritage strip — and in the spark's north-east heading. The red tile retires with honour: Athens red remains the
parent company's colour, not the operating system's.
