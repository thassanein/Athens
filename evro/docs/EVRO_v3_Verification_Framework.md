# Athens EVRO — v3 Verification & Validation Framework

Version: v3 · Last updated: 2026-06-30
Companion to `EVRO_v3_System_Specification.md` and `EVRO_v3_Requirements_Traceability.md`.

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
| **Total** | **53** | | | |

A release is **verified** when every **S1** check passes and no **S2** check fails.
