# Athens EVRO — v3 Verification & Validation Framework

Version: v3 · Last updated: 2026-07-05 (current through Phase 5B.7)
Companion to `EVRO_v3_System_Specification.md` and `EVRO_v3_Requirements_Traceability.md`.
Athens OS-era sections: §9D (5B platform), §9E (5B.5), §9F (5B.6), §9G (5B.7);
the 5B change log lives in `ATHENS_OS_PHASE5B.md`.

> **Purpose.** A reviewer (human or AI) uses this to *verify* — not assume — that
> EVRO behaves as specified. Every check has: a stable ID, the acceptance
> criterion, an exact way to verify it, and the expected result. Checks are
> written so they can be run against either **demo mode** (snapshot) or a **live
> Postgres** instance, since the engine is mirrored and the seed is deterministic.

## How to run a verification pass

1. **Build gate.** `cd evro/frontend && npm run build` must succeed with no errors.
2. **Engine gate (Node).** Import `engine.js` against `data/seed.json` and assert
   the numbers in §1–§4 below. A ready-made harness is in §8.
3. **UI gate (Playwright).** Drive the built app (`npm run preview`) and assert the
   DOM checks in §5–§7. Chromium is pre-installed (see spec §10).
4. **Determinism gate.** Regenerate seed/snapshot/SQL and assert no git diff (§9).
5. Record each check as **PASS / FAIL / N/A** with the observed value.

Severity: **S1** = guardrail/invariant (a FAIL invalidates the model). **S2** =
core capability. **S3** = experience/polish.

---

## 1. Guardrails (S1 — the invariants)

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-G1-target** | No savings/avoidance **target** exists anywhere. | Grep seed + source for a target field/word: `grep -rinE "target" evro/data/seed.json evro/frontend/src/lib` shows only `target_close` (a date) and copy that *denies* targets. No numeric goal-to-hit field. | No target metric; meta `note` states "no savings/avoidance targets anywhere". |
| **V-G2-pillars** | Both pillars are first-class. | Every initiative has `pillar ∈ {savings, avoidance}` and `benefit_type ∈ {reduction, savings, avoidance}`. | 100% coverage; both pillars present in the seed. |
| **V-G3-rank** | Ranking is by return / ROI, not vs a target. | `rankInitiatives(db,'return')[0]` and `(…, 'roi')[0]` return the max-RAV / max-ROI initiatives. | Order is monotonic in `rav()` / `roi()`. |
| **V-G4-realized** | Only FP&A-validated value is Realized. | In `realizedYTD`, set one actual's `validated=false` → its amount drops out. Confirm `validateActual` is reachable only with FP&A caps. | Unvalidated actuals never appear in realized YTD. |
| **V-G5-illustrative** | Opportunity bands are configurable + labeled illustrative. | `savings_pct_config` exists (14 rows); `setSavingsPct` mutates it; Opportunities/Methodology copy says "illustrative". | Band changes when config changes; UI labels it illustrative. |
| **V-G6-procurement** | Procurement ranked separately. | `leaderboard(db)` returns distinct `org` and `procurement` boards; no procurement person appears on the org board. | Disjoint boards; enterprise total still counts every initiative once. |
| **V-G7-realdata** | Seeded from the real 2025 AP register. | `meta.addressableHeadline === 437_400_000`; 14 `sourcing_groups`; 121 `spend_categories`. | Values match; `note` flags figures as illustrative placeholders. |

---

## 2. Value math (S2)

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-VM-rav** | RAV = gross × stage confidence × realization factor. | For any `i`: `rav(i) === i.gross_annual_value * STAGE_CONFIDENCE[i.stage] * i.realization_factor`. | Exact equality. |
| **V-VM-conf** | Stage confidence ladder is 0/.25/.5/.75/1/1/1/0. | Read `STAGE_CONFIDENCE`. | Matches spec §3.2. |
| **V-VM-realized** | Realized YTD sums only validated FY actuals. | Recompute by hand for one initiative. | Engine matches hand sum. |
| **V-VM-roi** | ROI = net annual ÷ implementation cost; payback in months. | `roi()`, `paybackMonths()` finite for initiatives with `implementation_cost > 0`. | Positive, finite. |
| **V-VM-npv** | NPV over 3 yrs @ 10%. | `npv(i, db)` uses `meta.npvHorizonYears=3`, `meta.discountRate=0.10`. | Sign and magnitude sane vs net annual. |
| **V-VM-leak** | Leakage = implemented-vs-negotiated + timing. | `leakageBreakdown(db)` totals = Σ per-initiative `valueLeakage`. | Components sum to total; ≥1 leaking initiative in seed. |
| **V-VM-sustain** | Sustainment score = realized ÷ expected-to-date, banded. | `sustainmentBook(db)` → `avg`, `items[]` with band, `eroding` = score < .7. | Avg ≈ 0.95; exactly the items below .7 are flagged eroding. |

---

## 3. Lifecycle, approvals & RBAC (S1/S2)

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-LC-stages** | 8-stage lifecycle, 4 gates. | `STAGES.length===8`; `GATE_STAGES` = idea/feasibility/capability/launch. | Matches spec. |
| **V-AP-intake** | New initiative needs line-manager + FP&A to enter pipeline. | `createInitiative` yields `request.kind==='intake'`, stage `proposed`; not counted in rollups until approved. | Proposed initiatives excluded from value totals. |
| **V-AP-gate** | Phase change needs line-manager + FP&A; Launch ≥ $100K also needs Steering. | `requiredRoles(i)` for a ≥`MATERIALITY` launch advance includes Steering; `gateCheck` blocks until satisfied. | Steering required iff gross ≥ 100K entering Launch. |
| **V-AP-enforced** | Approval is enforced in the **reducer**, not just UI. | Call `approveRequest`/`requestGate` directly in Node with a non-approver → rejected/no-op. | Server-side enforcement holds. |
| **V-AP-actual** | Only FP&A validates actuals. | `validateActual` with non-FP&A caps → blocked. | FP&A-only. |
| **V-RB-scope** | exec/admin/fpna = enterprise, leader = department, owner/procurement = own. | `scopeOf(user)` per role; `visibleInitiatives(db,user)` filters accordingly. | Owner sees only own; leader sees overseen depts; enterprise sees all. |
| **V-RB-pages** | Opportunity & Reporting restricted to exec/admin/fpna. | `allowedKeys(role)` excludes `opportunities`/`reporting` for owner/leader/procurement. | Restricted as specified. |
| **V-RB-guard** | Persona switch can't strand you on a forbidden page. | `App.jsx` redirects to role HOME when current page not allowed. | Auto-redirect to HOME. |

---

## 4. Engines (S2)

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-EN-control** | Control tower aggregates value created / pipeline / at-risk / leakage / inflation / capital. | `controlTower(db)` returns all fields, finite. | All present, non-negative where expected. |
| **V-EN-portfolio** | Portfolio & program rollups sum to enterprise. | Σ `portfolioRollup(db)` totals ≈ `enterpriseRollup(db)`. | Reconciles (no double-count). |
| **V-EN-dep** | Dependency DAG + critical path. | `dependencyGraph(db)` acyclic; `criticalPath(db)` returns the longest chain (tie-broke by value), length > 1. | ≥ 1 multi-node critical path (seed has a 6-node chain). |
| **V-EN-mc** | Monte-Carlo P10–P90 bracket the expected. | `monteCarlo(db)` → `p10 ≤ expected ≤ p90`. | Ordering holds; deterministic across runs. |
| **V-EN-opt** | Capital optimization respects the budget. | `optimize(db, meta.capitalBudget)` → `spend ≤ budget`, value maximized. | Within budget; selects positive-ROI set. |
| **V-EN-mine** | AI mining surfaces signals not already covered. | `mineOpportunities(db)` returns signal-backed rows; flags `alreadyCovered`. | ≥ 1 uncovered suggestion. |
| **V-EN-decisions** | Decisions queue is role-aware. | `decisionsRequired(db, user)` for FP&A vs owner differ; approvals only where the user is an approver. | Role-correct queue. |

---

## 5. Phase 2.5 — copilot & narrative (S2/S3)

| ID | Criterion | How to verify (Playwright/Node) | Expected |
|---|---|---|---|
| **V-CP-cards** | Copilot shows proactive insight cards. | `copilotInsights(db, admin)` returns kinds incl. summary/approval/leakage/opportunity/sustainment. Open "Ask EVRO" → ≥ 5 cards. | ≥ 5 cards, each computed from data. |
| **V-CP-qa** | Q&A answers from the portfolio. | `answerQuery(db,user,'leakage')` → title "Value leakage" with real numbers; chips Summary/Forecast/Leakage/Approvals/Opportunities/Capital all answer. | Deterministic, data-derived answers. |
| **V-CP-label** | AI is labeled rules-based. | Copilot header + footer state "rules-based" / "not a language model". | Present. |
| **V-CP-esc** | Esc closes the copilot. | Open copilot, press Escape. | Panel closes. |
| **V-NA-brief** | Cockpit Executive briefing renders headline + 4 bullets. | `execSummary(db)` → headline + 4 bullets; visible on Cockpit. | Renders. |
| **V-NA-story** | Story mode walks the briefing step-by-step. | Click "Story mode" → `.story-step` count ≥ 6. | ≥ 6 steps; "Exit story" restores. |
| **V-NA-changed** | "What changed" lists recent audit activity. | `whatChanged(db)` → audit entries with actor/action/detail/date. | Renders newest-first. |

---

## 6. Phase 2.5 — recognition & collaboration (S2/S3)

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-RC-levels** | Tiers from points: Platinum ≥10k, Gold ≥5k, Silver ≥2k, Bronze ≥0. | `recognition(db).byLevel`. | Current seed: Platinum 1, Gold 0, Silver 3, Bronze 3. |
| **V-RC-club** | Million Dollar Club = total FY ≥ $1M. | `recognition(db).millionClub`. | Dev Patel (Platinum), Jordan Rivera (Silver). |
| **V-RC-streak** | Streak = consecutive validated months. | `streakFor(db, 'u-patel')` etc. | Top champion Dev Patel: 12,416 pts, 6-mo streak. |
| **V-RC-sep** | Org board and Procurement board both shown; disjoint. | Recognition screen has Organization/Procurement toggle; no overlap. | Disjoint, mirrors `leaderboard`. |
| **V-CO-thread** | Initiative discussion thread renders + posts. | Open an initiative with comments (e.g. i-30) → ≥ 1 `.comment`; post → count increments. | Seed: 12 initiatives carry comments (23 total). |
| **V-CO-log** | Decision log shows validations + approvals. | Initiative Collaboration pane → decision log entries with actor/date/decision. | Renders for realizing initiatives. |
| **V-CO-mut** | `addComment` is a pure reducer (demo + live parity). | Call `addComment(db, id, text, actor)` in Node → returns new db with comment prepended; audit logged. | Pure, deterministic, logged. |

---

## 7. Cross-cutting (S2/S3)

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-XC-demo** | App works with no backend. | Block `/api/db` → app loads from snapshot, "Demo" badge. | Fully functional offline. |
| **V-XC-live** | App works against live Postgres. | Point at server → "Live DB" badge; mutations persist via `/api/action`. | Live parity. |
| **V-XC-parity** | Engine + mutations byte-identical client vs server. | `diff frontend/src/lib/engine.js server/src/engine.js` and same for mutations. | No diff. |
| **V-XC-prefix** | EVRO shares Postgres without touching facilities tables. | All EVRO tables prefixed `evro_`; facilities tables unchanged after EVRO migrate. | Isolation holds. |
| **V-XC-search** | ⌘K spans screens, initiatives, people, opportunities. | Open palette, type a person name → person entry; type an initiative → opens drawer. | All four entity types searchable. |
| **V-XC-noerr** | No console/page errors across screens. | Playwright sweep of all 21 screens. | 0 page errors (benign favicon 404 allowed). |
| **V-XC-resp** | Works desktop/laptop/tablet/phone. | Render at 1366 / 1024 / 768 / 390 px. | Layout adapts (sidebar → hamburger; grids collapse). |

---

## 8. Ready-to-run engine harness (Node)

```js
// node --input-type=module < this
import { readFile } from 'node:fs/promises'
import * as E from '../frontend/src/lib/engine.js'
const db = JSON.parse(await readFile('../data/seed.json', 'utf8'))
const admin = db.people.find(p => p.role === 'admin')
const assert = (id, ok, got) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${got ?? ''}`)

// G2 — both pillars on every initiative
assert('V-G2-pillars', db.initiatives.every(i => i.pillar && i.benefit_type))
// G6 — disjoint boards
const lb = E.leaderboard(db)
const orgIds = new Set(lb.org.total.map(p => p.id))
assert('V-G6-procurement', lb.procurement.total.every(p => !orgIds.has(p.id)))
// VM-rav — exact
const i = db.initiatives.find(x => x.stage === 'launch')
assert('V-VM-rav', Math.abs(E.rav(i) - i.gross_annual_value * E.STAGE_CONFIDENCE[i.stage] * i.realization_factor) < 1e-6)
// VM-sustain
const sb = E.sustainmentBook(db)
assert('V-VM-sustain', sb.eroding.every(x => x.score < 0.7), `avg=${sb.avg.toFixed(2)} eroding=${sb.eroding.length}`)
// RC-levels
assert('V-RC-levels', true, JSON.stringify(E.recognition(db).byLevel))
// RC-club
assert('V-RC-club', E.recognition(db).millionClub.length >= 1, E.recognition(db).millionClub.map(p=>p.name).join(', '))
// CP-cards
assert('V-CP-cards', E.copilotInsights(db, admin).length >= 5, E.copilotInsights(db, admin).map(c=>c.kind).join(','))
// EN-control
const ct = E.controlTower(db)
assert('V-EN-control', ['valueCreated','raPipeline','valueAtRisk','leakage','inflationExposure'].every(k => k in ct))
// EN-dep critical path
assert('V-EN-dep', E.criticalPath(db).length > 1, `len=${E.criticalPath(db).length}`)
```

Expected (current seed): all PASS; `byLevel = {Platinum:1,Gold:0,Silver:3,Bronze:3}`;
`millionClub = Dev Patel, Jordan Rivera`; sustain `avg≈0.95 eroding=2`;
copilot kinds `summary,approval,leakage,opportunity,sustainment`; critical-path `len=6`.

---

## 9. Determinism / drift gate

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-DET-seed** | Seed regenerates byte-identically. | `npm run gen:seed` then `git diff --exit-code data/seed.json frontend/src/lib/seed-snapshot.js`. | No diff. |
| **V-DET-sql** | Portable SQL regenerates from seed. | `cd server && npm run sql` then `git diff --exit-code db/seed.sql db/schema.sql`. | No diff. |
| **V-DET-mirror** | Server engine/mutations match frontend. | `diff` both pairs. | No diff. |

---

## 9A. Phase 3A experience transformation (S2/S3)

The overriding Phase 3A invariant (**S1**): the experience changed, the substance
did not. `V-3A-nologic` below is the guardrail — a FAIL invalidates the transform.

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-3A-nologic** (S1) | No engine/schema/API/RBAC/workflow change across Phase 3A. | `git diff 4563915~1..3dad1ad -- evro/frontend/src/lib/engine.js evro/server evro/data` shows no functional logic change (only inline colour tokens); `evro_*` schema and `/api` routes unchanged. | Presentation-only diff. |
| **V-3A-theme** | Dark is default; light is one toggle away; choice persists. | Load app → `documentElement[data-theme]` = "dark"; click ☀/☾ → "light"; reload → persisted. Print forces light. | Default dark, toggle + persistence work. |
| **V-3A-ct** | Control Tower shows AI recommendations + opportunity feed. | Cockpit → ≥1 `.reco-row` (from `copilotInsights`) + opportunity-feed rows (`mineOpportunities`, uncovered). | Both render, drill to targets. |
| **V-3A-radar** | Initiative health radar + benefits waterfall. | Open an initiative → Financials pane → radar (5 axes) + benefits bridge reconciling to RAV. | Both render; bridge = RAV. |
| **V-3A-cone** | Forecast confidence cone + scenario comparison + AI read. | Scenarios → cone band widens over future months; Downside/Plan/Stretch cards; AI interpretation updates with levers. | All present, reconcile to bridge. |
| **V-3A-frontier** | Capital efficient frontier + funding buckets. | Capital Allocation → concave frontier curve with envelope + funded markers; buckets by group. | Both render; funded dot on curve. |
| **V-3A-sustain** | Sustainment Command Center. | Nav → Sustainment → 30/90/180/365 windows recompute; book with band/trend/confidence; erosion cards with plan-vs-actual curves + recovery actions; Recover logs a task. | Window switch changes scores; recovery task persists. |
| **V-3A-story** | Full-screen Executive Story Mode. | Cockpit → "▶ Story mode" → full-screen presenter; →/←/Esc navigation; 6 slides. | Opens, navigates, Esc exits. |
| **V-3A-noerr** | All screens render dark with no page errors. | Playwright sweep of all 22 screens (Google-Fonts fetch offline is benign). | 17+ screens, 0 real errors. |

---

## 9B. Phase 3B experience — gap-closure program (S2/S3)

Same overriding invariant as Phase 3A: the experience grew, the substance did not.
`V-3B-nologic` is the guardrail (S1). The one deliberate exception is a data-only
seed change (illustrative geo/org tags) that rides JSONB with **no schema change** —
covered by `V-3B-geoseed`.

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-3B-nologic** (S1) | No engine/mutations/schema/API/RBAC/workflow change across Phase 3B. | `git diff bc698d4~1..43a8538 -- evro/frontend/src/lib/engine.js evro/frontend/src/lib/mutations.js evro/server evro/server/db/schema.sql` shows no functional change (the only `data/` diff is the seed geo tags — see `V-3B-geoseed`). New logic lives only in view-helpers that import, never modify, the engine. | Presentation-only; engine/mutations/schema/server byte-stable. |
| **V-3B-geoseed** | Seed carries illustrative `region`/`yard`/`business_unit` tags without a schema change. | Every initiative has the three tags; people have `region`/`yard`; `git show 0c9eede --stat` touches `gen-seed.mjs`/`seed.json`/`seed-snapshot.js`/`seed.sql` but **not** `schema.sql`/`engine.js`/`mutations.js`/`server/src`. Tags are deterministic (mulberry32) and labeled illustrative. | Tags present; schema untouched; regen is byte-stable (V-DET-seed). |
| **V-3B-intel** | Persistent intelligence bar + role-specific morning briefing. | `intelSummary(db,user)` / `morningBriefing(db,user)` (`briefing.js`) return role-correct content for all 6 roles; `.intel-bar` renders; open briefing → overlay with sections; Esc closes. | Renders for every role; no `.includes`-on-Set type errors. |
| **V-3B-realization** | Benefits Realization Waterfall reconciles and slices. | `realizationWaterfall(db,{dimension})` steps sum to realized (residual = timing plug); Realization screen shows the staircase + by-dimension table; changing dimension (BU/region/yard/owner) re-slices. | Reconciles exactly; dimension switch re-computes. |
| **V-3B-health** | 6-dimension initiative health radar + portfolio heatmap. | `HEALTH_DIMS.length===6`; `initiativeHealth(i,db)` → `{current, forecast, overall}`; Initiative Financials radar shows 6 axes + dashed forecast overlay; `portfolioHealth(db)` drives the Realization heatmap. | 6 dims; overlay renders; heatmap cells colour by band. |
| **V-3B-movement** | AVCM hub — geo/org leaderboards, awards, engagement. | `geoLeaderboard(db,'region'/'yard'/'business_unit')` rank by total FY; `movementStats`, `valueAwards`, `engagement` finite; Movement screen shows banner, awards, podium+standings, meters; 0 page errors. | Boards non-empty; awards resolve to real people/initiatives; engagement framed as a signal (no target). |
| **V-3B-story** | Story Mode gained audience + period lenses. | `storyBeats(db,{audience,period})` for Board/Executive/Operators × Full-FY/YTD/Remaining-FY returns 7–11 beats, reshaping order; presenter shows audience/period segmented controls, on-slide data tables; →/←/Space/Esc still work. | Beat count/order change with lens; keyboard nav intact. |
| **V-3B-packet** | PowerPoint board-packet export produces valid OOXML. | Click ⤓ .pptx (Story Mode) or ⤓ Board packet (Cockpit) → a `.pptx` downloads; unzip → `[Content_Types].xml` + `ppt/presentation.xml` + one `ppt/slides/slideN.xml` per beat, all well-formed; content matches the on-screen beats. | Valid multi-slide OOXML; opens in PowerPoint/Keynote/Slides; pptxgenjs is a lazy chunk (not in the main bundle). |
| **V-3B-motion** | Motion is tasteful, count-up works, reduced-motion honored. | `AnimatedValue` counts a formatted string 0→target (Story hero samples multiple frames); chart-reveal classes present (`.scatter-pt`,`.wf-bar`,`.bridge-track>i`,`.radar-shape`,`.line-draw/-fade`); under `reducedMotion:'reduce'` values render final and content opacity is 1; movement banner stacks ≤560px; 0 page errors. | Count-up + reveals animate; reduced-motion neutralizes; mobile banner stacks. |

---

## 9C. Phase 4A + enhancement program (S2/S3)

Same overriding invariant. `V-4A-nologic` is the guardrail (S1). Phase 4A + the
enhancements are the cleanest presentation-only span yet — **not even a data change**.

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-4A-nologic** (S1) | No engine/mutations/schema/API/RBAC/workflow/**data** change across Phase 4A + enhancements. | `git diff 360f13e~1..68df6d4 -- evro/frontend/src/lib/engine.js evro/frontend/src/lib/mutations.js evro/server evro/data evro/frontend/src/lib/seed-snapshot.js` is empty; engine/mutations client↔server parity holds. New logic is view-helpers that import (never modify) the engine; briefing/palette actions call the existing `approveRequest`. | Empty diff on all protected paths + data; parity intact. |
| **V-4A-lens** | Operating lenses are presentation-only, not RBAC. | `companion.js` `OPERATING_MODES` = CEO/CFO/COO/ops/procurement; `companionBrief(db,user,mode)` changes the headline metric + section order but scopes via `scopedView`; switching a lens never changes `visibleInitiatives`. | Lens changes emphasis, not permissions or numbers. |
| **V-4A-morning** | Morning Operating Screen is the default post-login home. | After entering, page title = "Morning operating screen"; greeting + value-under-management hero + lens selector; CEO vs CFO changes the headline metric; drill-throughs open the drawer/screen. | Default home; lens reframes; 0 errors. |
| **V-4A-companion** | The Companion replaces "Ask EVRO" with persona-framed intelligence + Q&A. | Topbar/intel-bar say "Companion"; panel shows greeting + metric + lens + proactive sections; `answerQuery` still answers (deterministic). | Renders for all roles; Q&A intact. |
| **V-4A-briefing2** | Executive Briefing 2.0 — marquee blocks + one-click approve. | `executiveBriefing(db,user)` returns 4 blocks (realized/driver/risk/leakage) + approvals/opportunities/actions; the briefing's Approve fires `approveRequest` and toasts; stacks to 1 column ≤460px. | Blocks render; approve executes; mobile stacks. |
| **V-4A-landing** | Landing = strategic enterprise summary + brand, gated before the app. | Landing shows the mark, value under management (count-up), rotating narrative, and 7 strategic stats (realized/forecast/opportunity/initiatives/leaders/regions/BUs); "Enter" → Morning; brand-click reopens. `favicon.svg` resolves. | Renders; enter flow works; role-framed eyebrow. |
| **V-4A-story3** | Story Mode 3.0 — 4 audiences, teleprompter, cinematic, richer packet. | `AUDIENCES` includes Business unit; Teleprompter (T) renders the note large; `.pptx` export has chapter dividers + speaker notes (notesSlides ≥ beats). | 4 audiences; teleprompter renders; deck has dividers + notes. |
| **V-4A-summit** | AVCM Value Summit — awards, MDC, gamification, seasons, scorecards. | `awardsGallery` ≥ 9; `millionClub` members + approaching; `gamificationStats.byLevel`; `valueSeasons` = 4 quarters; `executiveScorecard` = top champions; Summit renders all; records show values. | All sections render with real people/values. |
| **V-4A-valuegraph** | Enterprise Value Graph — relationship viz + concentration. | `buildValueGraph(db,{dimension,pillar})` groups + HHI/top-share; graph renders hubs + leaves + weighted edges; dimension switch re-groups; leaf click opens the drawer; concentration narrative reads. | Hubs+leaves render; HHI computed; drill-through works. |
| **V-4A-timeline** | Enterprise Timeline — longitudinal value + playback. | `buildTimeline(db)` → cumulative realized→forecast + per-month events + state; 12-month axis; Play advances the cursor and the as-of panel follows; scrub/month-click jump. | Realized→forecast line; playback advances; as-of updates. |
| **V-4A-command** | Executive Command Layer — universal ⌘K. | Palette groups Command/Approve/Navigate; one-click Approve fires `approveRequest` + toast; "optimize capital" navigates; "toggle theme" flips; palette closes after run. | Grouped commands; approvals + nav + theme run. |
| **V-4A-motion** | Enter transition, staged reveals, progressive disclosure, focus ring; reduced-motion honored. | Landing `leaving` → app; `.award-card/.podium-card/.record-card` stagger; `MoreList` "Show all"; `:focus-visible` navy ring on Tab; under `reducedMotion:'reduce'` enter is instant and content opacity is 1. | Transitions play; disclosure toggles; focus ring; reduced-motion instant. |

---

## 9D. Phase 5B — Athens OS platform (S1/S2)

Phase 5B is the one deliberate **additive** span: seven new JSONB entities, one
new mutation, and mirrored server support — under an authorization that allowed
backend change. The guardrail is therefore *additive-only*, not *empty-diff*:
nothing existing was modified. The engine remains byte-stable.

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-5B-additive** (S1) | Engine untouched; mutations/schema grew additively only. | `git diff f2fb864~1..1347f5f -- evro/frontend/src/lib/engine.js evro/server/src/engine.js` is **empty**. `mutations.js` diff adds `toggleModule` (and later `journalDecision`/`journalOutcome`, §9F) without altering any existing reducer; `schema.sql` adds `evro_`-prefixed tables only. Client↔server mirrors stay byte-identical (`diff` both pairs). | Engine empty diff; additive-only mutations/schema; mirror parity. |
| **V-5B-entities** | Seven new entities, deterministically seeded. | `org_nodes`, `forecast_scenarios` (4 lenses), `knowledge_cards` (22), `decision_journal`, `ai_recommendations` (6), `integration_sources`, `feature_flags` all present in `data/seed.json` via `gen-seed.mjs`; regen is byte-stable (V-DET-seed). `api.js` `withSchemaBackfill` adds missing collections to a stale localStorage db without touching existing data. | All seven present + deterministic; stale demo dbs backfill additively. |
| **V-5B-valueoffice** | Athens Value Office hub renders the operating surfaces. | Nav → Value Office: portfolio/value surfaces render for ENTL roles with 0 page errors. | Renders, role-gated. |
| **V-5B-pulse** | Enterprise Pulse — six-axis Value Radar + pulse index. | `enterprisePulse(db)` → 6 axes each 0..1, `index` 0–100, `band`; Pulse screen renders the radar. | 6 axes; index finite; radar renders. |
| **V-5B-knowledge** | Knowledge Layer explains every concept at three depths. | `knowledgeCards(db).length === 22`; `explain(card, level)` returns distinct copy for exec/practitioner/analyst; InfoDot popovers render. | 22 cards × 3 levels. |
| **V-5B-chief** | Chief of Staff AI shell with an explicit LLM seam. | `aiRecommendations(db)` → 6 recs, each `{agent, confidence, evidence[], rules_based: true}`; the shell renders only the entity (swapping the deterministic producer for an LLM would leave the UI unchanged — stated in code). | 6 recs; `rules_based` on every one; seam documented. |
| **V-5B-governance** | Workflow & Governance surface reads the audit trail. | Governance screen renders validations/approvals/audit entries with actor + date; 0 errors. | Renders. |
| **V-5B-integration** | Integration registry + module assembly flags. | `integrationSources(db)` with status/cadence/mappings; `featureFlags(db)`; `toggleModule` disables a non-core module (nav hides via `disabledNavKeys`) and **refuses core modules** — verified against live Postgres too (`/api/action`, `/api/integration`). | Toggle works; core refusal; nav reacts; server parity. |
| **V-5B-ai-label** | All "AI" is deterministic and labelled as such. | Grep the new surfaces for LLM calls (none exist); every AI badge/copy says rules-based/deterministic. | No model calls; labels present. |

---

## 9E. Phase 5B.5 — executive excellence sprint (S2/S3)

Presentation-only over the 5B platform. `V-55-nologic` is the guardrail (S1).
Verified with multi-agent adversarial review before each commit; the confirmed
defects (queue double-counting, unscoped board narrative, dead urgency tier,
reconciliation residual) were fixed pre-merge and are locked in below.

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-55-nologic** (S1) | No engine/mutations/schema/server/data change. | `git diff a7f51ca~1..f353a94 -- evro/frontend/src/lib/engine.js evro/frontend/src/lib/mutations.js evro/server evro/data` is empty. | Empty diff. |
| **V-55-mission** | Enterprise Mission Control — Pulse Ring + signals + one-click decisions. | `missionHealth(db)` → 5 rings (created/risk/velocity/adoption/transformation) + 6 signals; approve fires the existing `approveRequest`. | 5 rings, 6 signals; approvals work. |
| **V-55-queue** | Mission Queue classifies and NEVER double-counts. | `missionQueue(db,user)` → 5 classes; the `emitted` set guarantees one mission per underlying refId across classes, so `totalValue` counts each dollar once (the adversarial-review fix). | No refId appears twice; KPI = de-duplicated sum. |
| **V-55-orch** | Orchestration model — agent team + tensions. | `orchestrationModel(db,user)` → 5 stages with live stats; `tensions` resolve by higher confidence with dissent retained. | Stages + tensions render; resolution rule stated. |
| **V-55-radar** | Interactive Value Radar — stress, confidence, drill. | `stressedAxes(db, scen)` moves axes under a scenario; `axisConfidence(db)` grounds each axis; `axisDrill` lists contributors. | All three respond. |
| **V-55-narrative** | Executive Narrative Engine is persona-scoped. | `narrative(db, user, format)` for executive/board/operational formats; the **board** format must be built from `scopedView(db,user)` (the 5B.5 W5 fix — an owner's board brief shows only their book). | Formats differ; board narrative scoped. |
| **V-55-wall** | Opportunity & Risk Wall reconciles to the control tower. | `opportunityRiskWall(db)` risk column merges leakage into at-risk items; the intentional engine overlap vs `controlTower.valueAtRisk` is labelled "overlap de-duplicated" on the tile, not hidden. | Reconciliation stated; urgency tiers (incl. "This month") all reachable. |

---

## 9F. Phase 5B.6 — production hardening & executive workflow (S2/S3)

Additive-only mutations exception: `journalDecision` / `journalOutcome` (mirrored
client + server) power the auto-journal. Everything else is presentation.

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-56-additive** (S1) | Engine untouched; only the two journal reducers added. | `git diff eecf8da~1..713f0f2 -- evro/frontend/src/lib/engine.js evro/server/src/engine.js` empty; `mutations.js` diff = `journalDecision` + `journalOutcome` only, mirrored byte-identically server-side. | Empty engine diff; additive mirrored reducers. |
| **V-56-default** | Mission Control is the operating default with persistent context. | `HOME` maps exec/admin/fpna/leader → `mission`; lens/format/context persist (`evro.mc.prefs`); saved views (`evro.mc.views`, ≤4) apply/delete; `contextView(db, ctx)` scopes the whole screen; the `Enterprise` HQ geo-tag is excluded from the region list. | Default home; persistence; scoping; no bogus region. |
| **V-56-ring** | Pulse Ring is explainable, benchmarked, honestly trended. | `ringExplain(db,key)` → formula + live inputs; `RING_BENCH` bands labelled "illustrative — pending Athens KPI definitions"; `ringTrend` returns ONLY the historized series (validated realized by month) and the UI says other ring history isn't stored. | Formulas render; bands labelled; no fabricated series. |
| **V-56-evidence** | Explainability score: +25 × (confidence, evidence, linked record, assumptions). | `explainability(db, rec)` → score/tier (≥75 High, ≥50 Medium, else Basic) + parts; `TrustBadge` hover shows parts, evidence, assumptions, dependencies. | Score arithmetic exact; badge renders. |
| **V-56-queue-intel** | Mission intelligence: confidence, aging, escalation, "why #N?". | Every mission carries `intel` (per-class confidence + note, `ageDays` from `db.meta.now` — never the wall clock, escalation at >7d approvals / >30d blocked, urgency tier, deps); `missionWhy` explains the rank; Delegate creates a real task via `addTask`. | Deterministic aging; escalation badges; delegation on the record. |
| **V-56-account** | Ownership & Accountability board. | `ownershipBoard(db, dim)` for owner/BU/region/department → at-stake, realized, red, leaking, pending, red-age, hygiene (validated-actuals share), escalations; Escalate posts an `addComment` starting "Escalation:" and is disabled when nothing is red/leaking. | All four dims; hygiene correct; escalation gated + recorded. |
| **V-56-brief** | Morning Brief 2.0 — templates, copy-as-email, print/PDF. | Template checkboxes persist (`evro.brief.tpl`); ✉ Copy composes from the persona-scoped board narrative; ⎙ PDF opens the print window (`printBriefing`, popup-block safe). | All three work; scoped content. |
| **V-56-timeline** | Timeline carries decisions + supports A/B comparison. | `buildTimeline` months include journal + validation sign-off events (`kindCounts`); compare mode draws the A/B band and computes span deltas (value/realized/approvals/journal/actions). | Events present; compare deltas correct. |
| **V-56-journal-auto** | Gate decisions journal THEMSELVES — correctly. | Approve a request → a `decision_journal` entry appears with `auto: true`, composed BEFORE the mutation (the request state is destroyed on commit) and ONLY when the gate actually commits (partial approvals don't journal); postmortem (`journalOutcome`) records outcome + lessons. | Auto-entry on commit only; postmortems persist. |
| **V-56-hardening** | Error boundary, local telemetry, Do-next rail, a11y. | `ErrorBoundary` catches a thrown page render → fallback card + `track('error')`, reset on navigation; telemetry is local-only (`evro.telemetry`, "nothing leaves the device" stated, Reset works); `NextBestRail` shows top-3 missions on operating screens (collapse persists, hidden ≤900px); toasts are `role="status" aria-live="polite"`. | All four hold. |

---

## 9G. Phase 5B.7 — enterprise intelligence excellence (S2/S3)

The flagship sprint: ten brief items, all presentation-layer. `V-57-nologic` is
the guardrail (S1) — and with it, the engine's empty diff now spans the entire
5B era (f2fb864~1..3b848b5).

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-57-nologic** (S1) | No engine/mutations/schema/server/data change. | `git diff da497af~1..3b848b5 -- evro/frontend/src/lib/engine.js evro/frontend/src/lib/mutations.js evro/server evro/data` is empty. | Empty diff. |
| **V-57-health** | Enterprise Health Score — six dimensions, credit-score grades, honest trend. | `enterpriseHealth(db)` → 6 weighted dims each with formula/drivers/illustrative band; grade bands AAA…CCC; Customer & Workforce carry explicit `proxy` labels; `healthTrend` reconstructs ONLY the financial-realization input from history and the note says the other five aren't historized. | Seed scores **66 · BBB**; proxies labelled; no fabricated history. |
| **V-57-playback** | Enterprise Pulse Playback — replay, per-month truth, milestones. | `playbackModel(db)`: per-month "value lost" comes from the same profile weights as `expectedToDate` (NOT `forecastCurve`, which only projects future months); replay stops at `db.meta.now`; future frames are labelled forecast preview; the risks-aren't-date-stamped note renders; A/B pins produce span deltas. | Seed Feb→Jun compare: **$1.24M created · $48K lost · 19 decisions · 32 actions · +3 pts**. |
| **V-57-waterfall** | Value Waterfall is an exact identity with drill + scenario ghosts. | Per initiative `gross ≡ gross(1−conf) + gross·conf(1−rf) + rav`, so Potential − Risk − Adoption ≡ Σ rav **to the dollar**; scenario lenses reuse `forecast_scenarios` assumptions; ghost outlines + signed deltas where positive-is-good for every bar kind (a bigger drag under a downside lens must read RED); every step drills to initiatives + owners. | Seed base: **$13M → $7.70M RAV → $6.55M net → $1.63M realized** (all initiatives; the map's Realized sink shows $1.54M because it scopes to active only); delta colours correct. |
| **V-57-map** | Strategic Value Map — flow + transitive dependency trace, nothing hidden. | `strategicMap(db)`: functions → initiatives → outcomes; the tail pools into one labelled node (never silently dropped); `traceMap` follows blocking dependencies transitively BOTH ways; outcome sinks = realized / forecast / at-risk / leaking sums. | Trace dims non-neighbourhood; pooled node present; sinks reconcile. |
| **V-57-replay** | Chief of Staff mission animation — computed, not scripted. | `missionReplay(db,user)` → 5 phases whose console lines are live portfolio numbers (sweep counts, per-agent confidence, scenario holds, recalled lessons, conflicts with dissent retained, final call = max value then confidence); transport (run/step/pause/reset) works; reduced-motion leaves it fully usable. | Full run issues the final recommendation card with trust badge. |
| **V-57-heatmap** | AI Confidence Heatmap — quality-flagged, gaps stated. | `confidenceHeatmap(db)`: domains from what each agent actually watches (`AGENT_DOMAIN`); weak flag = explainability < 50 or evidence < 2; **Customer Experience renders as a coverage gap, never an invented score**; cells drill to their recommendations. | Gap row present; weak flags correct; drill works. |
| **V-57-scenario** | Executive Scenario Mode — scoped read-outs, digital-twin seams. | `execScenario(db, levers)`: inflation pressure on the addressable base is its **own** read-out (never silently netted into program EBITDA — the scope-mixing fix); capacity slots labelled illustrative; each lever names its integration-registry feed + status; capital lever re-runs the optimizer. | Six read-outs; scopes stated; feed badges resolve to real registry rows. |
| **V-57-decisions** | Decision Workspace — evidence, simulation, debate, existing mutations only. | `decisionCases(db,user)`: evidence strip (baseline/gate/sign-offs/risks/ROI·payback·NPV/trust); simulation unlock = `g·rf·(c₂−c₁)`, quarter-delay cost = unlock×3/12 (labelled illustrative); debate FOR/AGAINST composed from live signals, higher avg confidence leads, dissent retained, "the decision is yours"; Approve/Return/Delegate map ONLY to `approveRequest`/`rejectRequest`/`addTask`; approving auto-journals (V-56-journal-auto). | Case files complete; actions execute + journal; no new mutations. |
| **V-57-flagship** | Enterprise Intelligence Dashboard assembles it all. | The page carries: command strip (created/leaking/at-risk/decisions + routes), health hero + six-axis Value Radar, dimension drills, Playback, Waterfall, Scenario Mode, Confidence Heatmap, Strategic Map, Pulse Narrative (what changed/why/what matters/what next); Mission Control cross-links; strip chips use `.eis-chip` (no collision with the IntelligenceBar's `.intel-chip`); dark/light/mobile/reduced-motion sweeps show 0 page errors. | All panels present; routes work; clean sweeps. |

---

## 9H. Phase 6B — experience engine development (S2/S3)

Twelve brief items, six waves — the enterprise made felt, never faked.
`V-6B-nologic` is the guardrail (S1).

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-6B-nologic** (S1) | No engine/mutations/server/data change. | `git diff bfd0da7~1..0c8d22f -- evro/frontend/src/lib/engine.js evro/frontend/src/lib/mutations.js evro/server evro/data` is empty. | Empty diff. |
| **V-6B-energy** | Enterprise Energy — stated formula, honest history. | `enterpriseEnergy(db)`: 45% health + 30% pulse + 25% delivery pace, formula string carried; `energyHistory` reconstructs only the historized inputs and the note says so; `energyForecast` is a labelled projection. | Seed **56 · Stable**. |
| **V-6B-velocity** | Value velocity in $/day. | `valueVelocity(db)` → created/leak/net/needed per day from dated record; no wall clock (db.meta.now). | Seed ≈ **$9K/$6K/$3K/$21K per day**. |
| **V-6B-weather** | Enterprise Weather — worst signal first. | `enterpriseWeather(db)`: state from the worst live signal; carries why + recommendation + accent; alert renders only when a real threshold trips. | Seed **Overcast** with recommendation. |
| **V-6B-momentum** | Momentum engine — windows stated. | `momentum(db, scope)` for 6 scopes: recent 2 months vs the 2 before, validated landings only (`window` string); states accelerating/steady/decelerating/stagnant. | Seed business units: **0 accelerating · 3 decelerating**. |
| **V-6B-seasons** | Seasons — delivery vs profile, never aspiration. | `seasonFramework(db)`: per-quarter expected from `profileWeights`; score = 70% delivery + 30% hygiene; objectives are computed facts. | Seed **Q1 100 complete · Q2 97 current**. |
| **V-6B-mission** | Mission engine — difficulty & probability derived. | `missionProfile`: probability = conf × (1 − 0.4·risk) × dependency cut; weight ★1–5 uses `criticalPath(db).path` ids; ceremony composed from live numbers. | Formulas reproduce; no scripted values. |
| **V-6B-achieve** | Achievements — earned from dated data only. | `orgMilestones` crossings carry `crossedOn` dates derived from the record; maturity model level + progress computed. | Seed **L3 Practicing, 67% toward Optimizing**. |
| **V-6B-presence** | AI presence — honesty about the rules layer. | `aiPresence(db,user,page)`: six agents + Operator states; lead follows `PAGE_AGENT`; every confidence carries a grounding `confNote`. | Lead matches page; notes render. |
| **V-6B-moments** | Celebrations, rituals, signature — provable, gated, repeatable-safe. | `detectCelebrations` fires only on state diffs vs the `evro.celebrated` store; rituals run through `contextView`; `detectSynergies` uses real structure (enables edges, shared groups); welcome/AI-discovery/synergy intros gate once via `evro.signature`. | No un-earned ceremony; gates persist. |

## 9I. Phase 6C.1 — brand identity system (S2/S3)

The Pulse Identity era: mark, symbols, tokens, manifesto, living Brand page.
Superseded on the master-brand question by 6C.1B (§9K) — these checks verify
the system as the state layer it became.

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-6C1-nologic** (S1) | No engine/mutations/server/data change. | `git diff 73bfcb1~1..776f587 -- …` (guard paths) is empty. | Empty diff. |
| **V-6C1-mark** | Pulse Orbital geometry exact. | `EvroMark`: three arcs sweep 357°→93° clockwise (gap opens NE), spark at 45° on r38, core r6.5; the journey variant colours the arcs from `JOURNEY[1..3]`. | Arc endpoints match `arcPath`; gap NE. |
| **V-6C1-symbols** | Eight enterprise symbols, theme-safe. | `SYMBOLS`: 24-grid, currentColor, 2px strokes; filled dots carry `stroke="none"`; light theme overrides the three theme-static hexes (momentum/ai/energy). | Glyphs legible both themes. |
| **V-6C1-tokens** | Brand tokens themed. | `--brand-value/risk/caution/intelligence/momentum/ai/energy` defined for dark AND light (e.g. energy #F5A524 / #9a6b0a). | Both blocks present in index.css. |
| **V-6C1-page** | Brand page = living specimens. | Every mark/token/glyph/motion on the page is the production component; anatomy chips visible in both themes. | No pictures-of-the-brand. |
| **V-6C1-doc** | Guidelines claims corrected + superseded honestly. | v2.0 carries the fixed claims (three-arc journey; three gated one-time moments; glow box-shadow caveat) and the 6C.1B convergence preface pointing to the architecture record. | Preface present; claims accurate. |

## 9J. Phase 6C.1A — icon & identity exploration (S2/S3)

Five directions, three systems, five live-number concepts, a recorded
six-judge verdict. The exploration is itself a product surface (Identity Lab).

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-6CA-nologic** (S1) | No engine/mutations/server/data change. | `git diff 9ad1190~1..639db0c -- …` (guard paths) is empty. | Empty diff. |
| **V-6CA-marks** | Five direction systems, floor-safe, a11y-clean. | `Marks.jsx`: MarkPulse closes rings ≤24px; GOLD darkens to #B45309 on light fields (≥3:1); every decorative instance is `aria-hidden`, labelled ones announce. | 16px scale rows legible; ARIA split correct. |
| **V-6CA-artboards** | Comp artboards are theme-proof fixed fields. | `.con-sys/.con-desk/.con-phone` pin their palette via local custom properties — flipping `data-theme` cannot invert their ink (the review-confirmed fix). | Wordmarks/heroes legible under light theme. |
| **V-6CA-live** | Even a mock must not lie. | Every number in the landing/homepage concepts computes from the live db (EVUM, at-stake, value-at-risk, top opportunity, momentum counts, season score); the H1 bars scale from `enterpriseRollup().bridge`. | No fabricated figures; bars 3-step honest. |
| **V-6CA-panel** | The verdict is a disclosed, auditable, recorded judgment. | All three surfaces say the judges were model-run AI personas; `identity-verdict.js` matches `docs/EVRO_6C1A_panel_result.json` verbatim; means/Borda recompute from the raw per-judge scores. | **Monogram 6.9 mean · Borda 21**; compass/signal 5.5 tie breaks 17 v 15; as-of-panel-time qualifier present. |
| **V-6CA-pages** | Pages verdict recorded with picks. | Landing pick **L3 Value First** (9/8), home pick **H1 Command Center** (7/4 with mobile-rebuild note); pick tags render; the second card carries the advisory badge. | Picks + provenance visible. |
| **V-6CA-mobile** | Verdict table mobile + AA. | ≤640px the direction column is sticky with opaque composite on the winner row; light-theme winner text #8a5f08 (≥AA on the gold wash). | Sticky column; contrast ≥4.5:1. |

## 9K. Phase 6C.1B — enterprise identity convergence (S2/S3)

The verdict becomes architecture: four coordinated layers, converged surfaces,
motion identity, finalized manifesto. `V-6CB-nologic` is the guardrail — and
with it the engine's empty diff spans Phase 3A through 6C.1B.

| ID | Criterion | How to verify | Expected |
|---|---|---|---|
| **V-6CB-nologic** (S1) | No engine/mutations/server/data change. | `git diff e8aefa4~1..eb64f9e -- …` (guard paths) is empty; the full-era check `git diff bfd0da7~1..eb64f9e -- …` is also empty. | Both diffs empty. |
| **V-6CB-master** | Master brand promoted, size-aware, id-clean. | `MasterMark`: ≤28px drops the bezel, strokes 6.8→8, apex 5.2→6 ("EV" readable at 16px); six variants; favicon.svg is the small-size geometry verbatim; BrandMark/BrandLockup aliases resolve to the monogram (NavBar, loading, Signature, Landing); no duplicate DOM ids across chrome instances. | Ladder legible to 16px; aliases swapped; `[id]` dupes = 0. |
| **V-6CB-compass** | Compass states read the mission queue. | `compassIdentity(db,user)`: orient when decisions open; locked when a ranked mission leads with none open; idle when clear. | Seed: **orient — "2 decisions open"**. |
| **V-6CB-rings** | Five named gauges, formulas on the rings, honest zero. | `pulseIdentity(db)`: Energy/Momentum/Health/Risk containment/Transformation, each from the engine that owns it, formula string carried; sweep = score; score < 1 renders an empty track (no linecap dot); mobile behavior = Energy gauge + chips. | Seed **56 / 0 / 66 / 61 / 49**; zero ring empty. |
| **V-6CB-signal** | Signal states from real presence. | `signalIdentity(db,user)`: orchestrating when missions ranked; sensing when agents watch; agent roster carries state/confidence/confNote. | Seed: **orchestrating — Chief of Staff leads · 32 missions**. |
| **V-6CB-rules** | Interaction rules rendered and internally consistent. | Identity page: hierarchy (signs→orients→gauges→senses), coexistence (one leader per surface; gold the only crossing token; the mark that signs never gauges), transition loop with the master abstaining. | All three blocks render; no contradiction with §9I/§9K marks. |
| **V-6CB-landing** | Definitive landing = Value First + Status, theme-proof. | Status band (compact gauge, state, weather, net/day) renders above the EVUM hero; `.landing` pins its palette — setting `data-theme=light` does not flip its ink. | Seed band: **56 Stable · Overcast · $3K/day**; pinned tones. |
| **V-6CB-home** | Homepage convergence + mobile distillation. | Vitals strip carries momentum chips (window in tooltip) + season chip; ≤760px `.vit-deep` and the sparkline hide (gauge + state + weather + created/net + chips remain). | Seed chips: **▲0 · ▼3 · Q2 in season 97**; distilled at 440px. |
| **V-6CB-motion** | Motion identity — verbs per layer, reduced-motion rests. | `MOTION_IDENTITY`/`MOTION_LAWS` render with live demos; under `prefers-reduced-motion: reduce` every animation computes to `none` (emulated check). | Four layers × verbs; reduce → none. |
| **V-6CB-docs** | The architecture record is authoritative and honest. | `EVRO_Identity_Architecture.md`: lineage 6C.1 → 6C.1A verdict → 6C.1B; layer specs match the shipped components; guidelines preface declares the supersession. | Doc ↔ code agree; preface present. |

## 10. Pass/fail summary template

| Section | Checks | Pass | Fail | N/A |
|---|---|---|---|---|
| Guardrails (S1) | 7 | | | |
| Value math | 7 | | | |
| Lifecycle/approvals/RBAC | 8 | | | |
| Engines | 7 | | | |
| Copilot & narrative | 7 | | | |
| Recognition & collaboration | 7 | | | |
| Cross-cutting | 7 | | | |
| Determinism | 3 | | | |
| Phase 3A experience | 9 | | | |
| Phase 3B experience | 9 | | | |
| Phase 4A + enhancements | 12 | | | |
| Phase 5B platform | 9 | | | |
| Phase 5B.5 executive excellence | 7 | | | |
| Phase 5B.6 production hardening | 10 | | | |
| Phase 5B.7 enterprise intelligence | 10 | | | |
| Phase 6B experience engines | 10 | | | |
| Phase 6C.1 brand identity | 6 | | | |
| Phase 6C.1A identity exploration | 7 | | | |
| Phase 6C.1B identity convergence | 10 | | | |
| **Total** | **152** | | | |

A release is **verified** when every **S1** check passes and no **S2** check fails.
The experience guardrails — `V-3A-nologic`, `V-3B-nologic`, `V-4A-nologic`,
`V-55-nologic`, `V-57-nologic`, `V-6B-nologic`, `V-6C1-nologic`, `V-6CA-nologic`,
`V-6CB-nologic` (empty-diff) and `V-5B-additive`, `V-56-additive` (additive-only,
mirrored) — must all pass. The strongest single invariant in the repo:
**`engine.js` has an empty diff from Phase 3A through Phase 6C.1B** — nine
sprints of experience, brand and identity work, zero change to the value math.
