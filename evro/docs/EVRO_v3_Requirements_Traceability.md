# Athens EVRO — v3 Requirements Traceability Matrix

Version: v3 · Last updated: 2026-06-30
Companion to `EVRO_v3_System_Specification.md` and `EVRO_v3_Verification_Framework.md`.

> **Purpose.** Maps every requirement from the source documents — the original
> cost-management brief, the EVRO Master PRD, the v2 Enhancement Blueprint, and
> the Phase 2.5 World-Class Experience Layer — to the implementing code and the
> verification check that proves it. This is the gap report: anything not
> **Done** is called out explicitly.
>
> **Status legend:** ✅ Done · 🟡 Partial · ⏳ Deferred (fast-follow) · ❌ Not started.

---

## A. Foundational cost methodology (original brief)

| Req | Requirement | Implementation | Verify | Status |
|---|---|---|---|---|
| A1 | Cost **Reduction** (baseline − negotiated) | `baseline.formula`, `rav`, pillar `reduction` | V-G2 | ✅ |
| A2 | Cost **Savings** (original − new run-rate) | `benefit_type savings`, `netAnnual` | V-G2 | ✅ |
| A3 | Cost **Avoidance** (projected − actual) | pillar `avoidance`, `inflationExposure` | V-G2, V-EN-control | ✅ |
| A4 | Should-cost / cleansheet framing | `approach` field + Methodology copy | V-RB-pages | ✅ |
| A5 | Win-room / negotiated value | `negotiated_value`, `implementedRunRate` | V-VM-leak | ✅ |
| A6 | Volume leverage | opportunity levers + Methodology | — | ✅ |
| A7 | Implemented-vs-negotiated **leakage** | `valueLeakage`, `leakageBreakdown` | V-VM-leak | ✅ |
| A8 | Maverick / digital spend analytics | `mineOpportunities`, Spend Explorer | V-EN-mine | ✅ |
| A9 | Responsive desktop/laptop/tablet/phone | CSS grid + sidebar→hamburger | V-XC-resp | ✅ |
| A10 | PostgreSQL persistence | `server/`, `evro_*` tables, `/api/db`+`/api/action` | V-XC-live | ✅ |

## B. EVRO Master PRD — operating model

| Req | Requirement | Implementation | Verify | Status |
|---|---|---|---|---|
| B1 | **Return-maximization — no targets** | no target field; meta `note`; copy | V-G1 | ✅ |
| B2 | Both pillars tracked | `pillar`+`benefit_type` | V-G2 | ✅ |
| B3 | Rank by biggest return (RAV) / best ROI | `rav`, `roi`, `rankInitiatives` | V-G3 | ✅ |
| B4 | Only FP&A-validated value = Realized | `realizedYTD`, `validateActual` | V-G4, V-AP-actual | ✅ |
| B5 | Opportunity bands illustrative + configurable | `savings_pct_config`, `setSavingsPct` | V-G5 | ✅ |
| B6 | Seeded from real 2025 AP register | `gen-seed.mjs`, meta totals | V-G7 | ✅ |
| B7 | Per-persona views (exec/lead/FP&A/leader/owner) | `pages/*`, `capsFor`, `allowedKeys`, HOME map | V-RB-pages, V-RB-scope | ✅ |
| B8 | Each persona sees only their projects | `scopeOf`, `visibleInitiatives`, `scopedView` | V-RB-scope | ✅ |
| B9 | Opportunity view limited to exec/EVRO-lead/FP&A | `CAN_SEE_OPPORTUNITIES` | V-RB-pages | ✅ |
| B10 | Approval: new project → line mgr + FP&A | `createInitiative`, intake request | V-AP-intake | ✅ |
| B11 | Approval: phase change → line mgr + FP&A (+Steering ≥$100K) | `requestGate`, `requiredRoles`, `MATERIALITY` | V-AP-gate | ✅ |
| B12 | Approval: actuals → FP&A | `validateActual` | V-AP-actual | ✅ |
| B13 | Procurement persona, separated metrics | `role procurement`, `leaderboard.procurement` | V-G6 | ✅ |
| B14 | Approval enforced server-side (not UI only) | reducers in `mutations.js` (mirrored) | V-AP-enforced | ✅ |

## C. v2 Enhancement Blueprint — value engines

| Req | Requirement | Implementation | Verify | Status |
|---|---|---|---|---|
| C1 | Enterprise hierarchy (Portfolio›Program›Initiative›Workstream) | `portfolios`,`programs`,`workstreams`; `portfolioRollup`,`programRollup` | V-EN-portfolio | ✅ |
| C2 | Extended lifecycle (proposed→…→retired) | `STAGES` (8), `LIFECYCLE_STAGES` | V-LC-stages | ✅ |
| C3 | NPV / payback / financial case | `npv`,`paybackMonths`,`financials` | V-VM-npv | ✅ |
| C4 | Value leakage (timing + contract) | `leakage`,`leakageBreakdown` | V-VM-leak | ✅ |
| C5 | Dependency DAG + critical path | `dependencies`, `dependencyGraph`, `criticalPath` | V-EN-dep | ✅ |
| C6 | Monte-Carlo forecast + sensitivity | `monteCarlo`,`sensitivity` | V-EN-mc | ✅ |
| C7 | Capital allocation / knapsack optimization | `optimize`, Capital Allocation screen | V-EN-opt | ✅ |
| C8 | AI opportunity mining | `mineOpportunities`, Mining screen | V-EN-mine | ✅ |
| C9 | Control tower | `controlTower`, Cockpit tiles | V-EN-control | ✅ |
| C10 | Decision Cockpit ("dashboard IS the app") | `Cockpit.jsx`, `decisionsRequired` | V-EN-decisions | ✅ |
| C11 | ⌘K command palette | `CommandPalette.jsx` | V-XC-search | ✅ |
| C12 | Contextual drawer (drill without leaving) | `Drawer.jsx` + embedded `Initiative` | V-CO-thread | ✅ |
| C13 | Inflation exposure | `inflationExposure`, group inflation | V-EN-control | ✅ |
| C14 | Value matrix (value vs effort/risk) | `valueMatrix`, Value Map + scatter | V-EN-control | ✅ |

## D. Phase 2.5 — World-Class Experience Layer

| Req | Requirement | Implementation | Verify | Status |
|---|---|---|---|---|
| D1 | AI copilot ("Ask EVRO") | `Copilot.jsx`, `copilotInsights`, `answerQuery` | V-CP-cards, V-CP-qa | ✅ |
| D2 | AI labeled rules-based (no LLM) | header/footer copy | V-CP-label | ✅ |
| D3 | Decision narrative — exec summary | `execSummary`, Cockpit briefing card | V-NA-brief | ✅ |
| D4 | "What changed since yesterday?" | `whatChanged`, Cockpit feed | V-NA-changed | ✅ |
| D5 | Story mode | Cockpit `.story-steps` | V-NA-story | ✅ |
| D6 | Recognition Center / Value Champion Dashboard | `Recognition.jsx`, `recognition` | V-RC-levels | ✅ |
| D7 | Levels (Bronze/Silver/Gold/Platinum) | `POINT_LEVELS`, `levelFor` | V-RC-levels | ✅ |
| D8 | Million Dollar Club | `recognition.millionClub` | V-RC-club | ✅ |
| D9 | Streaks | `streakFor` | V-RC-streak | ✅ |
| D10 | Sustainment scoring + erosion alerts | `sustainmentScore`,`sustainmentBook`; Cockpit board + copilot alert | V-VM-sustain | ✅ |
| D11 | Initiative collaboration (comments / activity / decision log) | `addComment`, Collaboration pane in `Initiative.jsx` | V-CO-thread, V-CO-log | ✅ |
| D12 | Enterprise search (people + opportunities in ⌘K) | `CommandPalette.jsx` | V-XC-search | ✅ |
| D13 | Mentions / tasks / attachments on comments | `addComment` mentions + `addTask`/`toggleTask` + `addAttachment`; Collaboration pane | V-CO-thread | ✅ (sprint S1) |
| D14 | Three-pane workspace (Timeline\|Financials\|Collaboration) | `Initiative.jsx` tabbed panes + persistent KPI strip | V-CO-thread | ✅ (sprint S1) |

## E. Fast-follows — status

The "Executive Readiness & Experience Hardening" sprint (post-v3) closed four of
these. Each shipped as its own tested commit; no new engines were added.

| Req | Requirement | Status | Note |
|---|---|---|---|
| E1 | Drag-and-drop capital allocation | ✅ (sprint S3) | Interactive Funded/Available board on `optimize()` — drag + +/− + live budget meter + auto-optimize. |
| E2 | Mobile polish (dense tables) | ✅ (sprint S5) | Sticky first column, tighter cells, scroll-shadow, topbar fit; 0 horizontal overflow verified at 390px. |
| E3 | Impact simulation ("what if I move $X") | ✅ (sprint S4) | Four-lever forecast simulator + telescoping value bridge on `scenarioTotals`/`sensitivity`/`monteCarlo`. |
| E4 | True `.xlsx` export | ⏳ | Print/PDF export available; native xlsx not built. |
| E5 | Real LLM copilot | ⏳ (by design) | Copilot is intentionally deterministic/rules-based for verifiability. |
| E6 | SharePoint write / Outlook calendar | ⏳ | Inherited M365 limitation (read-only app registration). |

---

## Coverage summary

| Source document | Requirements | ✅ Done | 🟡 Partial | ⏳ Deferred |
|---|---|---|---|---|
| A · Cost methodology brief | 10 | 10 | 0 | 0 |
| B · EVRO Master PRD | 14 | 14 | 0 | 0 |
| C · v2 Enhancement Blueprint | 14 | 14 | 0 | 0 |
| D · Phase 2.5 Experience Layer | 14 | 14 | 0 | 0 |
| E · Fast-follows | 6 | 3 | 0 | 3 |
| **Total** | **58** | **55** | **0** | **3** |

All **S1 guardrails** and **core (S2)** requirements are Done, and the post-v3
experience-hardening sprint closed the workspace, collaboration, capital-allocation,
simulation and mobile gaps. The three remaining items (native xlsx export, a real
LLM copilot, M365 write-back) are deliberate deferrals, each noted above.
