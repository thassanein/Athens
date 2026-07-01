# Athens EVRO — Brand Guidelines

Version: 1.0 (Phase 4A) · Last updated: 2026-07-01

> EVRO is the **Athens Enterprise Value Realization Operating System**. The brand
> is calm, precise and executive — Bloomberg's density, Palantir's seriousness,
> Apple's restraint. This guide is the source of truth for the mark, palette,
> type, motion and voice. Implemented in `frontend/src/components/Brand.jsx`,
> `frontend/public/favicon.svg`, and the design tokens in `frontend/src/index.css`.

---

## 1. The mark

A **four-node value ascent** — the EVRO story in one glyph. Four points rise and
compound left-to-right, mapping the lifecycle every initiative travels:

**Opportunity → Investment → Realization → Sustainment**

- Nodes grow in size along the climb — value compounding, not just moving.
- Default app/favicon lockup: white ascent on the red brand tile (rounded square,
  24/100 corner radius, red gradient `#E5243B → #8F1220`).
- "Journey" variant colours each node by its stage (see §2) for storytelling
  surfaces (landing page, decks): purple → blue → green → teal.
- Components: `BrandMark({ size, tile, journey })` and `BrandLockup({ size, sub, variant })`.

**Clear space** ≥ 25% of the mark's height on all sides. **Minimum size** 16px
(favicon). Never rotate, recolour the tile, add effects, or stretch the mark.

## 2. Colour

Semantic first — colour carries meaning, never decoration.

| Token | Dark | Light | Meaning |
|---|---|---|---|
| `--red` | `#E5243B` | `#D5172A` | brand / alert / primary action |
| `--green` | `#3FC97F` | `#1A5632` | realized · validated · positive |
| `--navy` | `#4F8DF2` | `#1A428A` | forecast · investment · info |
| `--amber` | `#F2B23E` | `#B7791F` | risk · watch · pending |
| `--opp` (purple) | `#A874F5` | `#7C3AED` | opportunity |
| teal | `#2FB39A` | — | sustainment (journey mark) |
| `--bg` / `--card` | `#0E0E11` / `#16161A` | `#F1F4F8` / `#FFFFFF` | canvas / surface |
| `--ink` | `#F4F4F6` | `#1A2736` | primary text |

**Journey palette:** Opportunity `#A874F5` → Investment `#4F8DF2` → Realization
`#3FC97F` → Sustainment `#2FB39A`.

Dark is the default surface; a full light theme lives under
`html[data-theme='light']` and is one toggle away (persisted).

## 3. Typography

- **Archivo** — headings, UI, body. Weights 400–900; hero display at 800/900 with
  tight tracking (`-1` to `-1.5px`).
- **Space Mono** — every numeral (KPIs, tables, money). Fixed-width so counting
  numbers never jitter.
- Scale: hero `clamp(38–72px)`, H1 30px, H2 22px, H3 15–18px, body 13–15px,
  caption/tiny 11–12px. Uppercase eyebrows at 12px / +2px tracking / weight 800.

## 4. Motion

Motion is a signal, not decoration — and always optional.

- **Entrances:** staggered `rise` (opacity + 10px translateY) for page blocks;
  `pop` for KPI tiles; SVG charts draw in (bars grow, lines stroke on, radar/
  bubbles scale). Curve `cubic-bezier(0.22, 1, 0.36, 1)`, 0.35–0.6s.
- **Numbers:** count up from previous value (`AnimatedValue`, easeOutCubic ~0.65s).
- **Micro-interactions:** hover-lift on tiles/cards, button press, smooth row hovers.
- **Accessibility:** a global `@media (prefers-reduced-motion: reduce)` neutralizes
  all of it; `@media print` forces final state. Never gate meaning on motion.

## 5. Voice

Executive, declarative, honest. "Return is the only target." Name the number and
what it means. Say what's deferred. Never imply a savings/avoidance target — EVRO
**maximizes return**, and value counts as realized only once FP&A validates it.
"AI" is always labeled **rules-based / deterministic** (no language model).

## 6. Applications

- **Product chrome** — sidebar lockup (mark + wordmark), favicon, theme-color `#0E0E11`.
- **Landing experience** (`Landing.jsx`) — hero, enterprise value under management,
  Find Value • Realize Value • Sustain Value, the four-stage journey band.
- **Presentation templates** — the native `.pptx` board packet (`board-packet.js`)
  is the canonical deck: dark master, red top rule, Archivo type, semantic tone
  colours, and the footer "value counts only once FP&A validates it." Audience
  (Board/Executive/Operators) × period (Full FY/YTD/Remaining FY) lenses.
- **Machine surfaces** — `/overview`, `/api/*`, `/llms.txt` carry the same voice.

## 7. Do / Don't

- **Do** lead with a real number and its meaning. **Don't** invent targets or fabricate data.
- **Do** keep colour semantic. **Don't** use green for anything unrealized or red for non-alerts.
- **Do** honor reduced-motion. **Don't** block content behind an animation.
- **Do** label AI as rules-based. **Don't** imply a language model.
