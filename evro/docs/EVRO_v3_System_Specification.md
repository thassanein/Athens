# Athens EVRO — v3 System Specification (as-built)

**Enterprise Value Realization Operating System**
Version: v3 (v2 EVROS + Phase 2.5 + Phase 3A cockpit + Phase 3B gap-closure + Phase 4A + enhancement program)
Status: as-built — every claim below maps to a file/function in this repo.
Last updated: 2026-07-01

> This is the **source of truth** for what EVRO *is*. The companion documents
> verify that it does what it should:
> - `EVRO_v3_Verification_Framework.md` — acceptance criteria + how to verify each one.
> - `EVRO_v3_Requirements_Traceability.md` — every requirement → implementation → status.

---

## 1. What EVRO is

A return-maximization operating system for the Athens Services indirect/direct
spend portfolio. It runs the full value lifecycle — from raw spend signal, to
opportunity, to gated initiative, to FP&A-validated realized value — and ranks
everything by **biggest return** and **best ROI**, never against a savings target.

It reuses the facilities-compliance app's exact stack and ships as a
self-contained sibling app under `evro/`.

### 1.1 Non-negotiable principles (the guardrails)

These are invariants. The verification framework tests each one explicitly.

| # | Principle | Where enforced |
|---|---|---|
| G1 | **Return-maximization — no savings/avoidance target anywhere.** Nothing in the UI, data, or copy states a target to hit. | `data/seed.json` meta note; no target field in schema; Methodology page |
| G2 | **Both value pillars tracked** — cost reduction/savings **and** cost avoidance. | `pillar` + `benefit_type` on every initiative; `PILLAR_LABEL`, `BENEFIT_LABEL` |
| G3 | **Rank by Biggest Return (RAV) and Best ROI.** | `rav()`, `roi()`, `rankInitiatives()` |
| G4 | **Only FP&A-validated value is Realized.** Provisional value never counts as realized. | `realizedYTD()` counts only `validated` actuals; `validateActual` mutation is FP&A-gated |
| G5 | **Opportunity bands are illustrative**, driven by a configurable `savings_pct` table and labeled as such. | `savings_pct_config`; `setSavingsPct` mutation; Opportunities + Methodology copy |
| G6 | **Procurement is ranked on a separate board** so the rest of the org can compete (change-management intent). | `leaderboard()` returns `{org, procurement}`; `recognition()` mirrors it |
| G7 | **Seeded from the real 2025 AP register** ($437.4M addressable headline, 14 sourcing groups, 121 categories). Dollar/person figures on initiatives are illustrative placeholders. | `data/gen-seed.mjs`; meta `addressableHeadline` / `note` |

### 1.2 Brand & theme (Phase 3A)

The default experience is a **dark cockpit** (Bloomberg/Palantir/Linear language):
canvas `#0E0E11`, layered panels `#16161A`/`#1E1E24`, hairline borders. A semantic
colour system carries meaning — **realized** green `#3FC97F`, **forecast** blue
`#4F8DF2`, **risk** amber `#F2B23E`, **opportunity** purple `#A874F5`, **alert**
red `#E5243B` — each with soft/line variants. Type: **Archivo** (sans) + **Space
Mono** (all numerals). A full **light theme** (the original Helvetica-Neue palette:
red `#D5172A`, navy `#1A428A`, green `#1A5632`) is preserved under
`html[data-theme="light"]` and toggled from the topbar (☀/☾), persisted to
localStorage. The whole app themes through CSS custom properties in
`frontend/src/index.css`; `--dark` is the raised inverted surface and `--ink` the
primary text.

---

## 2. Architecture

```
evro/
  data/
    gen-seed.mjs          Deterministic seed generator (mulberry32, seed 20260630)
    seed.json             Canonical seed (server reads this)
  frontend/               React 18 + Vite SPA, vanilla CSS, hand-built SVG charts
    src/lib/
      engine.js           Deterministic value engine (mirrored to server)
      mutations.js        Pure mutation reducers db→db (mirrored to server)
      seed-snapshot.js    AUTO-GENERATED bundled snapshot (demo/offline mode)
      api.js              Source detection + client (live API → snapshot fallback)
      format.js           Display formatters
      story.js            Phase 3B/4A — audience/period/BU story beats (view-only composer)
      board-packet.js     Phase 3B — .pptx board-packet export (lazy pptxgenjs)
      briefing.js, realization.js, health.js, movement.js   Phase 3B view-only helpers
      companion.js        Phase 4A — operating lenses + strategic summary (view-only)
      avcm.js, valuegraph.js, timeline.js   Enhancements — summit / value-graph / timeline helpers
    src/pages/            One file per screen (28 screens)
    src/components/        NavBar, Drawer, Copilot(Companion), CommandPalette, Charts, ui, Icons,
                          IntelligenceBar, Briefing, StoryMode, Landing, Brand
  server/                 Node + Express over PostgreSQL, single-origin
    src/index.js          API + diagnostics + SPA serving
    src/engine.js         Byte-identical mirror of frontend engine
    src/mutations.js      Byte-identical mirror of frontend mutations
    src/store.js          Loads db from Postgres tables; applies actions
    db/migrate.js         Tables + content-hash-gated reseed
    db/make-sql.mjs       Emits portable schema.sql + seed.sql
```

### 2.1 Key architectural decisions

- **Demo-mode-first.** With no backend, `api.js` falls back to the bundled
  snapshot + `localStorage`; the app is fully functional offline. With a backend,
  it reads `GET /api/db` and posts mutations to `POST /api/action`.
- **Single source of mutation truth.** `mutations.js` reducers are pure `db→db`
  and run **both** optimistically client-side **and** authoritatively server-side.
  The same file is mirrored to `server/src/mutations.js` (byte-identical).
- **Engine mirrored client↔server.** `engine.js` → `server/src/engine.js`,
  byte-identical, so diagnostics and the SPA compute identical numbers.
- **Shared Postgres via table prefixing.** EVRO shares the facilities app's free
  Render Postgres; every EVRO table is prefixed `evro_` (`evro_meta` holds the
  seed hash). Facilities tables are untouched.
- **Engine index in a WeakMap** (not on the cloned db object) so a JSON clone
  can't carry a stale memo.

### 2.2 Data sources & badges

`GET /api/db` success → `source: 'postgres'` → "Live DB" badge.
Any failure/timeout → `loadLocal()` (snapshot or localStorage) → "Demo" badge.

---

## 3. Data model

`seed.json` top-level keys (array counts from the current seed):

| Key | Count | What |
|---|---|---|
| `meta` | — | FY frame, addressable totals, discount rate, NPV horizon, capital budget, guardrail note |
| `krs` | 5 | Key results initiatives can link to |
| `people` | 12 | Roster with `role`, `fn` (function), `procurement` flag, `oversees`, `region`/`yard` (Phase 3B geo tags) |
| `portfolios` | 4 | Top of the hierarchy (`pf-asset`, `pf-network`, `pf-sourcing`, `pf-corporate`) |
| `programs` | 5 | Portfolio → Program grouping |
| `sourcing_groups` | 14 | Real AP-register groups with spend, category count, P&L line, inflation |
| `spend_categories` | 121 | Category-level addressable spend (heavy head + long tail) |
| `savings_pct_config` | 14 | Per-group illustrative opportunity bands (configurable, G5) |
| `opportunities` | 10 | Sized, claimable opportunities |
| `initiatives` | 44 | The value initiatives (see §3.1) |
| `dependencies` | 22 | DAG edges between initiatives |
| `badges` | 6 | Recognition badge definitions |
| `points_ledger` | 3 | Spot recognition points |
| `audit_log` | 2 | Seed audit trail (grows at runtime) |

### 3.1 Initiative shape (the central entity)

```
id, title, description, owner_id, group_id, spend_category_id, program_id,
pillar ('savings'|'avoidance'), benefit_type ('reduction'|'savings'|'avoidance'),
region, yard, business_unit (illustrative geo/org tags — Phase 3B seed prep, JSONB, no schema change),
stage, status_rag, approach, gross_annual_value, realization_factor, effort_score,
profile ('linear'|'ramp'|'scurve'|'seasonal'), implementation_cost,
start_date, target_close, kr_link, opportunity_id,
baseline { formula, reference, comparison, basis, source_ref, validated_by, validated_at },
negotiated_value, contributions[ {user_id, credit_pct} ], workstreams[],
benefit_lines[ {pnl_line, recurrence, annual_amount} ], actuals[ {period, realized_amount, validated} ],
risks[ {category, likelihood, impact, score, status, countermeasure} ],
validations[ {type, decision, actor_id, decided_at, note} ],
request (approval workflow state | null),
comments[ {id, by, at, text, mentions[]} ], tasks[ {id, text, assignee_id, status, created_by, at} ],
attachments[ {id, name, kind, url, by, at} ]
```

### 3.2 Lifecycle & confidence

`STAGES`: `proposed → idea → feasibility → capability → launch → realization → sustainment → retired`.
`GATE_STAGES` (the funnel): idea, feasibility, capability, launch.
`REALIZING_STAGES`: launch, realization, sustainment.
`STAGE_CONFIDENCE`: proposed 0 · idea .25 · feasibility .5 · capability .75 · launch/realization/sustainment 1.0 · retired 0.

Current seed distribution: 2 proposed · 11 idea · 10 feasibility · 8 capability · 6 launch · 4 realization · 2 sustainment · 1 retired.

### 3.3 Value formulas (engine)

- **RAV (risk-adjusted value)** = `gross_annual_value × STAGE_CONFIDENCE[stage] × realization_factor`. `rav()`
- **ROI** = net annual benefit ÷ implementation cost. `roi()`, `netAnnual()`
- **Realized YTD** = Σ validated actuals in FY (FP&A-gated). `realizedYTD()`
- **Risk-adjusted forecast (rest of FY)** = remaining months × RAV profile weight. `forecastRemainderFY()`, `profileWeights()`
- **Total FY** = realized YTD + risk-adjusted forecast FY. `totalFY()`
- **NPV** = `npv()` over `meta.npvHorizonYears` (3) at `meta.discountRate` (10%). **Payback** = `paybackMonths()`.
- **Leakage** = implemented-vs-negotiated + timing. `leakage()`, `leakageBreakdown()`, `valueLeakage()`
- **Sustainment score** = realized ÷ expected-to-date for realizing initiatives; band strong/watch/eroding. `sustainmentScore()`, `sustainmentBook()`

---

## 4. Roles, scope & capabilities (RBAC)

`ROLE_SCOPE`: exec/admin/fpna = **enterprise** · leader = **department** · owner = **own**.
Procurement scope = own (plus separated metrics). Roster: 1 exec, 2 admin (EVRO Lead),
1 fpna, 1 leader, 5 owner, 2 procurement.

| Role | Edit | Validate | Steering | Admin | Home | Sees |
|---|---|---|---|---|---|---|
| Executive | – | – | – | – | Cockpit | enterprise |
| EVRO Lead (admin) | ✓ | ✓ | ✓ | ✓ | Cockpit | enterprise |
| FP&A | – | ✓ | – | – | Cockpit | enterprise |
| Function leader | ✓ | – | ✓ | – | Department | own department(s) via `oversees` |
| Initiative owner | ✓ | – | – | – | My Initiatives | own initiatives only |
| Procurement | ✓ | – | – | – | My Initiatives | own initiatives; separate board |

Scope is enforced in the engine (`scopeOf`, `visibleInitiatives`, `canSeeInitiative`,
`scopedView`, `overseenDepts`) and gated in `App.jsx` (`capsFor`, `allowedKeys`).
Opportunity & Reporting screens are restricted (`CAN_SEE_OPPORTUNITIES`,
`CAN_SEE_REPORTING` → exec/admin/fpna).

---

## 5. Approval workflow

Three approval surfaces, enforced in the reducers (not just the UI):

1. **New initiative (intake).** Created as `proposed`; needs **line manager + FP&A**
   to enter the pipeline. `createInitiative` → `request` (kind `intake`).
2. **Phase change.** Every gate advance needs **line manager + FP&A**; entering
   **Launch at ≥ `MATERIALITY` ($100K)** also needs **Steering**. `requestGate`,
   `approveRequest`, `rejectRequest`, `gateCheck`, `requiredRoles`, `approvalState`.
3. **Actuals reporting.** Only **FP&A** can validate an actual (→ Realized). `validateActual`.

Approver eligibility: `canApproveRoles`, `canRequestAdvance`, `pendingApprovalsFor`,
`ROLE_APPROVE_LABEL`. A user holding multiple approver roles can sign off all of
them at once.

---

## 6. Screens (28)

Grouped as in `NavBar.jsx`. "Scope" = whose data the screen shows. The app opens on a
premium **Landing** (`Landing.jsx`) — the strategic enterprise summary + brand — then
enters the OS; **Today** (the Morning Operating Screen) is the default post-login home.
Persistent chrome: an **Intelligence bar** (`IntelligenceBar.jsx`), the on-demand
**Executive Briefing 2.0** overlay (`Briefing.jsx` — marquee blocks + one-click
approve), the **EVRO Companion** (`Copilot.jsx` — persona-framed intelligence), and the
**Executive Command Layer** (`CommandPalette.jsx`, ⌘K — run/approve/navigate). All
view-only over existing engine outputs; the command/briefing actions call **existing**
mutations (they don't modify them).

### Decisions
| Screen | File | Roles | Purpose |
|---|---|---|---|
| Today | `Morning.jsx` | all (default home) | **Morning Operating Screen** (Phase 4A, net-new): greeting + **value under management** hero (count-up), a **CEO/CFO/COO/Operations/Procurement operating lens** that reorders emphasis (presentation viewpoints, not RBAC), and today's priorities — recommendations / decisions / risks / opportunities / sustainment (progressive disclosure), each drilling in. |
| Decision Cockpit | `Cockpit.jsx` | exec/admin/fpna | Executive **Control Tower**: **Executive briefing** (AI narrative) + full-screen **Story mode** (audience/period lenses, Phase 3B) + one-click **⤓ Board packet** `.pptx` export, control-tower tiles, decisions queue with one-click approve, **AI recommendations** strip + **Opportunity feed** (Phase 3A), value-vs-risk scatter, portfolio rollup, inflation exposure, **What changed** feed, **Savings sustainment** board. |
| My Department | `Department.jsx` | leader | Leader's overseen departments rollup. |
| My Initiatives | `MyWork.jsx` | owner/procurement | The owner/procurement home — their initiatives only. |

### Dashboards
| Screen | File | Roles | Purpose |
|---|---|---|---|
| Executive | `Exec.jsx` | exec/admin/fpna | Enterprise rollup, pillars, funnel, top risks. |
| Portfolios | `Hierarchy.jsx` | + leader | Portfolio › Program › Initiative hierarchy rollups. |
| Initiatives | `Portfolio.jsx` | + leader | Ranked, filterable initiative list (scoped). |
| Forecast | `Forecast.jsx` | all | Forecast workbench (committed/expected/upside, curve). |
| Timeline | `Timeline.jsx` | + leader | **Enterprise Timeline** (enhancements, net-new): longitudinal value — cumulative realized (solid) → risk-adjusted forecast (dashed) across the FY, per-month event markers (realized landings + audit-log decisions), a time cursor + scrubber + **Play** (historical storytelling), and a "state as of {month}" + live portfolio-state panel. |
| Reporting | `Reporting.jsx` | exec/admin/fpna | Reporting workspace. |

### Value engines
| Screen | File | Roles | Purpose |
|---|---|---|---|
| Value Map | `ValueMap.jsx` | + leader | Value-vs-effort matrix. |
| Scenarios | `Scenarios.jsx` | exec/admin/fpna | Forecast **Playground**: four what-if levers → live value bridge, **confidence cone** (widening P10–P90 over the FY), Downside/Plan/Stretch **scenario comparison**, rules-based **AI interpretation**, Monte-Carlo + sensitivity. |
| Capital Allocation | `Optimize.jsx` | exec/admin/fpna | Interactive drag-and-drop board on the knapsack optimizer: Funded/Available columns, live budget meter, auto-optimize, **efficient frontier** curve + **funding buckets** (Phase 3A). |
| Sustainment | `Sustainment.jsx` | exec/admin/fpna/leader (scoped) | **Sustainment Command Center** (Phase 3A, net-new): 30/90/180/365 trailing windows, sustainment book (band/trend/confidence), erosion-watch cards with plan-vs-actual curves + rules-based recovery actions → one-click recovery task. |
| Value Realization | `Realization.jsx` | exec/admin/fpna/leader (scoped) | **Benefits Realization Waterfall** (Phase 3B, net-new): decomposes gross → implementation → adoption → leakage → timing → realized (reconciles exactly), sliceable by business unit / region / yard / owner / department, with a root-cause card, by-dimension table, and a portfolio **health heatmap**. |
| Dependencies | `Dependencies.jsx` | + leader | Dependency DAG + critical path. |
| Value Graph | `ValueGraph.jsx` | + leader | **Enterprise Value Graph** (enhancements, net-new): a radial relationship view — Enterprise → region / business unit / department / owner → initiatives, sized by value, edged by share, coloured by risk; hover to isolate, click a leaf to drill in; dimension + pillar filters; **Herfindahl (HHI) concentration** tiles + narrative. |
| AI Mining | `Mining.jsx` | exec/admin/fpna | Rules-based opportunity mining from spend signals. |
| Opportunities | `Opportunities.jsx` | exec/admin/fpna | Sized, claimable opportunity board (illustrative bands). |
| Spend Explorer | `Spend.jsx` | all | Addressable spend rollup by group/category. |

### Engage
| Screen | File | Roles | Purpose |
|---|---|---|---|
| Value Movement | `Movement.jsx` | all | **AVCM — Athens Value Creation Movement** (Phase 3B, net-new): "Find Waste · Create Value · Build Our Future" — participation stats, value-awards hall of fame, **Region / Yard / Business-unit** leaderboards (podium + standings), and adoption & engagement meters. Engagement is a signal, not a target. |
| Value Summit | `Summit.jsx` | all | **AVCM Value Summit** (Phase 4A, net-new): the recognition showcase — champion spotlight, champions podium, a nine-card **awards gallery**, the **Million Dollar Club** (+ approaching), **gamification** (tiers/streaks/badges), FY records, plus **value seasons** (realized by quarter) and **executive scorecards** (enhancements). |
| Leaderboard | `Leaderboard.jsx` | all | Org board + separate Procurement board. |
| Recognition | `Recognition.jsx` | all | Value Champion Dashboard — tiers, Million Dollar Club, streaks, org + procurement boards. |
| Sustainability | `Sustainability.jsx` | all | ESG / sustainability view. |

### Reference / flows
| Screen | File | Purpose |
|---|---|---|
| Methodology | `Methodology.jsx` | The value methodology + guardrail explanations. |
| New initiative | `Intake.jsx` | Intake form → proposed initiative + approval request. |
| Initiative | `Initiative.jsx` | Three-pane workspace (Timeline \| Financials \| Collaboration) + persistent KPI strip. Financials opens with a **6-dimension health radar** (Phase 3B — Financial/Implementation/Technology/Adoption/Governance/Sustainment, with a dashed forecast overlay) + **benefits waterfall**, then value, baseline, capital case, benefit lines, contributors. Collaboration = discussion/mentions/tasks/attachments + decision log. Also rendered embedded in the Drawer. |

---

## 7. Phase 2.5 experience layer

All "AI" is **deterministic and rules-based** — computed from the live portfolio,
labeled "AI · rules-based" in the UI. No language model is involved.

- **Ask EVRO copilot** (`Copilot.jsx`): proactive insight cards (`copilotInsights`)
  + rules-based Q&A (`answerQuery`) with quick chips. Opens from the topbar; Esc closes.
- **Decision narrative** (Cockpit): `execSummary` (headline + 4 bullets), Story mode,
  `whatChanged` (audit-log feed), `sustainmentBook` (durability board).
- **Recognition center** (`Recognition.jsx`): `recognition` → `POINT_LEVELS`
  (Bronze/Silver/Gold/Platinum via `levelFor`), Million Dollar Club ($1M+ total FY),
  validated-month `streakFor`, org + procurement boards.
- **Collaboration** (`Initiative.jsx`): discussion thread (`addComment`) + decision
  log (validations + approvals). Seeded with comments on 12 realizing initiatives.
- **Enterprise search** (`CommandPalette.jsx`, ⌘K): screens + initiatives + people + opportunities.

---

## 7A. Phase 3A experience transformation

Transformed the **experience layer only** to a world-class dark cockpit —
**no engine, calculation, schema, API, RBAC, or workflow was changed**. Every
addition reads existing engine outputs; all "AI" stays deterministic/rules-based.

- **Design system** — dark cockpit default + light toggle (§1.2); Archivo + Space
  Mono; semantic colour language applied through CSS custom properties.
- **Executive Control Tower** (`Cockpit.jsx`) — AI-recommendations strip
  (`copilotInsights`) + opportunity feed (`mineOpportunities`).
- **Initiative Workspace** (`Initiative.jsx`) — `Radar` health chart (5 factors) +
  benefits waterfall (gross → confidence → realization → RAV).
- **Forecast Playground** (`Scenarios.jsx`) — confidence cone (`forecastCurve` +
  `monteCarlo` sigma), Downside/Plan/Stretch comparison, AI interpretation.
- **Capital Allocation** (`Optimize.jsx`) — efficient frontier + funding buckets.
- **Sustainment Command Center** (`Sustainment.jsx`, net-new) — 30/90/180/365
  windows, erosion curves, confidence, recovery actions.
- **Executive Story Mode** (`StoryMode.jsx`) — full-screen, keyboard-navigable
  presenter over `execSummary`/`controlTower`.

New view-only chart components in `Charts.jsx`: `Radar`; plus inline confidence
cone, efficient frontier, and erosion curves. No new engine functions.

---

## 7B. Phase 3B experience — gap-closure program

Phase 3B continued the **presentation-only** discipline: every wave composes
existing engine exports through new `frontend/src/lib/` view-helpers (which never
modify `engine.js`) and new components. **No engine, mutations, API, RBAC, or
approval-workflow change.** The one data change is a set of *illustrative* geo/org
tags in the seed (below); it rides in the JSONB `data` column — **schema is
unchanged**. All "AI" stays deterministic/rules-based. Commit range
`bc698d4…43a8538`.

- **Seed geo/org tags (data only).** `region`, `yard`, `business_unit` added to
  every initiative and `region`/`yard` to people, deterministically derived in
  `gen-seed.mjs`. Regenerated `seed.json` / `seed-snapshot.js` / `seed.sql`;
  `schema.sql`, `engine.js`, `mutations.js`, and `server/src` untouched (they ride
  JSONB). These enable the movement/realization slices and are labeled illustrative.
- **AI-as-interface** (`IntelligenceBar.jsx`, `Briefing.jsx`, `briefing.js`) — a
  persistent intelligence bar (role pulse + jump-offs) and an on-demand, role-specific
  **morning briefing**, both composing `execSummary`/`decisionsRequired`/`whatChanged`
  /`copilotInsights`/opportunities.
- **Benefits Realization Waterfall** (`Realization.jsx`, `realization.js`) —
  gross → implementation → adoption → leakage → timing → realized, reconciling
  exactly; sliceable by BU/region/yard/owner/department; + portfolio health heatmap.
- **6-dimension Health Radar** (`health.js`, `Initiative.jsx`) — Financial /
  Implementation / Technology / Adoption / Governance / Sustainment, current vs a
  dashed forecast overlay, derived from confidence/roi/risk/sustainment/delivery
  proxies; plus `portfolioHealth` for the heatmap.
- **AVCM Value Movement hub** (`Movement.jsx`, `movement.js`) — geo/org
  leaderboards, value awards, and adoption/engagement analytics off the seed tags.
- **Story Mode expansion + PowerPoint board packet** (`story.js`,
  `board-packet.js`, `StoryMode.jsx`) — the presenter gained **audience** (Board /
  Executive / Operators) and **period** (Full FY / YTD / Remaining FY) lenses that
  reshape the deck (7–11 beats), on-slide data tables, and a native **`.pptx`
  board-packet export** (pptxgenjs, loaded via dynamic `import()` so it is a lazy
  chunk). The presenter and the exported deck render the **same beats** — one source
  of truth.
- **Motion & polish** (`ui.jsx` `AnimatedValue`, `Charts.jsx`, `index.css`) —
  number count-up, staggered entrance reveals, SVG chart draw-ins, and
  micro-interactions, all wrapped by a global `prefers-reduced-motion` guard;
  `@media print` forces final state so reveals never blank a printed page.

---

## 7C. Phase 4A + enhancement program

Phase 4A ("category-defining OS") and the follow-on enhancement program continued
the **presentation/orchestration-only** discipline. **No engine, mutations, schema,
API, RBAC, or workflow change — and no data change at all** (verify: `V-4A-nologic`,
commit range `360f13e…68df6d4`). New logic lives only in view-helpers that import,
never modify, the engine; the briefing/command actions **call the existing
`approveRequest` mutation**, the same path the cockpit uses. "AI" stays deterministic.

**Operating lenses.** CEO / CFO / COO / Operations / Procurement are **presentation
viewpoints** (`companion.js`), not RBAC roles — they reorder emphasis and pick a
headline metric only, and never change permissions or the numbers (scope is still
`scopedView`-enforced). The Story Mode audiences (Board / Executive / Operators /
Business-unit) are the same idea for the narrative.

Phase 4A (5 waves):
- **Executive AI Companion + Morning Operating Screen** (`companion.js`, `Copilot.jsx`,
  `Morning.jsx`) — persona-lens brief + the default post-login "today" screen.
- **Landing experience + brand identity** (`Landing.jsx`, `Brand.jsx`,
  `public/favicon.svg`, `docs/EVRO_Brand_Guidelines.md`) — the enterprise-OS front door
  + the permanent four-node value-ascent mark (Opportunity→Investment→Realization→
  Sustainment) + guidelines. A sessionStorage `entered` gate renders Landing before the app.
- **Executive Story Mode 2.0** (`story.js`, `StoryMode.jsx`, `board-packet.js`) — the
  operating-review arc (chapters + presenter notes), Present auto-play, ambient tone
  glow, and a richer `.pptx` (section dividers + speaker notes).
- **AVCM Value Summit** (`avcm.js`, `Summit.jsx`) — champions/podium/awards/MDC/
  gamification/records.
- **Motion & experience polish** — cinematic enter, staged reveals, progressive
  disclosure (`MoreList`), keyboard focus ring.

Enhancement program (6 waves):
- **Executive Morning Briefing 2.0** (`briefing.js` `executiveBriefing`, `Briefing.jsx`)
  — marquee blocks (value realized / largest driver / biggest risk / leakage) + a
  sign-off queue with **one-click Approve**, opportunities and recommended actions.
- **Landing strategic summary** (`companion.js` `strategicSummary`/`strategicNarratives`)
  — leaders / regions / business units, rotating narratives, animated accumulation,
  role framing.
- **Enterprise Value Graph** (`valuegraph.js`, `ValueGraph.jsx`) — relationship viz +
  Herfindahl concentration.
- **Enterprise Timeline** (`timeline.js`, `Timeline.jsx`) — longitudinal value + playback.
- **Executive Command Layer** (`CommandPalette.jsx`) — universal ⌘K (run / approve /
  navigate), one-click approvals via the existing mutation.
- **Story Mode 3.0 + AVCM seasons + motion** — teleprompter + business-unit narrative;
  `valueSeasons` + `executiveScorecard` on the Summit; a branded loading state.

---

## 8. API surface

| Method | Route | Notes |
|---|---|---|
| GET | `/api/db` | whole portfolio (SPA data source) |
| POST | `/api/action` | apply a mutation `{action, payload}` server-side |
| GET | `/api/portfolio` | diagnostics rollup (JSON) |
| GET | `/api/exec` | executive summary (JSON) |
| GET | `/api/health` | liveness + DB status (200 even without DB) |
| GET | `/api` | endpoint discovery index |
| GET | `/overview` | server-rendered HTML overview |
| GET | `/llms.txt` | plain-text guide for AI tools |
| GET | `*` | SPA fallback |

Mutations (`mutations.js`): `createInitiative`, `requestGate`, `approveRequest`,
`rejectRequest`, `validateBaseline`, `validateActual`, `addActual`, `addRisk`,
`claimOpportunity`, `setSavingsPct`, `claimMined`, `recoverLeakage`, `addComment`,
`addTask`, `toggleTask`, `addAttachment`.

---

## 9. Determinism & reproducibility

- The seed generator is fully deterministic (mulberry32, fixed seed `20260630`,
  fixed `meta.now = 2026-06-30`). No `Date.now()`/`Math.random()` at runtime in the
  engine. Re-running `npm run gen:seed` reproduces `seed.json`, `seed-snapshot.js`
  byte-for-byte.
- `npm run sql` (server) regenerates `schema.sql` + `seed.sql` from `seed.json`.
- CI-style drift guard: snapshot/SQL must be regenerated and committed after any
  seed change (see Verification framework V-DET-*).

---

## 10. Build, run, regenerate

```bash
# Frontend (demo mode, no backend)
cd evro/frontend && npm install && npm run dev          # :5174

# Regenerate seed + snapshot after editing gen-seed.mjs
cd evro/frontend && npm run gen:seed

# Regenerate portable SQL
cd evro/server && npm run sql

# Mirror engine + mutations to the server (must stay byte-identical)
cp evro/frontend/src/lib/engine.js   evro/server/src/engine.js
cp evro/frontend/src/lib/mutations.js evro/server/src/mutations.js

# Full stack against local Postgres
cd evro/server && PGHOST=/tmp PGPORT=5601 PGUSER=postgres PGDATABASE=evro PORT=4100 NODE_ENV=production node src/index.js
```
