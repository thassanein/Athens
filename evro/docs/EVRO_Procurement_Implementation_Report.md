# EVRO Procurement — Phase One Implementation Report

**Programme:** Procurement as EVRO's first active capability · **Owner:** Claude Code ·
**Status:** complete · **Branch:** `claude/athens-cost-management-ui-rxtiip`
**Core directive:** *Refactor, do not rebuild.* One platform, one identity, one architecture,
one AI, one data model. No new repo, app, brand, or duplicate procurement system.

**Primary success test:** *an executive understands savings status, confidence, risk and the
next decision in under five seconds* — met (status-first dashboard + narrative + decision queue).

---

## 1. What shipped, by wave

| Wave | Commit | What shipped |
|---|---|---|
| W1 Capability gating | `02511b0` | `lib/capabilities.js` — six enterprise capabilities (Procurement on; Fleet/Operations/CX/HR/Finance declared-off), localStorage-persisted, admin-configurable, anchor invariant. Procurement-first sidebar; Settings page (capability + experience toggles). |
| W2 Data model | `ffa73a3` | `lib/procurement.js` — a pure VIEW layer over the engine: 8 savings-type definitions + classifier, the 11-stage savings lifecycle (lens over the engine's 8-stage gate model), the reusable Opportunity value object, rollups that reconcile, suppliers/categories/contracts. |
| W3 Executive Dashboard | `b672f9c` | Savings Under Management headline + four progress lenses, KPI tiles, deterministic executive narrative, 11-stage pipeline funnel, forecast curve, decision queue, at-risk, savings-by-type, top blockers. |
| W4 Opportunity Workspace | `99ab678` | Mission header, lifecycle track, board-ready summary, business case, financial & operational impact, supplier/category, dependencies & risks, decision history, AI insight (trust contract), Evidence Drawer. Plus the Savings Pipeline list. |
| W5 Decision Center | `ced3e8f` | Ranked decision queue, the full decision-intelligence contract, recommended action + explanation, alternatives, decision lineage, and live RBAC-gated Approve / Return / Request-advance actions. |
| W6 Enterprise AI | `386c22d` | Five deterministic decision-intelligence briefs (pipeline, risk, forecast variance, approvals, realization), each with the full trust contract + evidence drill. |
| W7 Mobile Command | `e3d50bd` | Procurement-aware command bar with live decision + approval badges, thumb-friendly opportunity cards, and the approve/reject/comment trio on the phone. |
| W8 QA & board demo | *(this commit)* | Consolidated 5-agent adversarial review; 8 findings fixed; board-demo script; this report. |

## 2. Surfaces & routes (all reuse existing pages where one existed)

`procurement` (Executive Dashboard) · `savingspipeline` · `opportunity` (Workspace) ·
`decisioncenter` · `procai` (Enterprise AI) · `settings`. Nav "Opportunities" → the sourced
board, "Enterprise Memory" → the 6D AI-Trust/Memory page, Analytics → Reporting. Route guards
and the command palette span the **full** nav, so capability gating curates the front door,
never reachability.

## 3. The reconciliation guarantee

Every procurement figure derives from one `savingsOpportunity` value object. The partition
buckets (potential/committed/realized/sustained) each count an opportunity once and **sum to
the $12,339,922 headline**, equal to the pipeline-by-stage Σ and the by-type Σ — verified to
the dollar. The cumulative funnel lenses (identified $13.6M ≥ committed $6.0M ≥ realized
$1.5M) are a separate, clearly-labelled view and are never summed into the total.

## 4. Deterministic engine confirmation

`git diff` of `frontend/src/lib/engine.js`, `server/src/engine.js`,
`frontend/src/lib/mutations.js`, `server/src/mutations.js` and `data/` across the **entire**
procurement programme is **empty**. Procurement is a lens over the value engine, not a rewrite.
The strongest invariant in the repo now holds from Phase 3A through Procurement Phase One.

## 5. Consolidated adversarial review (W8)

Five parallel reviewers (reconciliation, RBAC/security, accessibility, responsiveness+React,
honesty/determinism); **8 confirmed findings, all fixed**:

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | High | Mobile command bar marked the ENTL procurement tabs `always`, bypassing `allowedKeys` — an owner/procurement persona could reach Executive Dashboard / Decision Center / Pipeline. | Role-scoped tabs now fall through the `allowedKeys(role)` gate; Home resolves to the dashboard only when entitled. Verified: owner bar shows Home/AI/More only. |
| 2 | High | Dashboard narrative said "committed to the plan" with the partition **bucket** while the tile above used the cumulative **lens** — two numbers, same label. | Narrative now uses `lenses.committed` ($6.05M), matching the tile. |
| 3 | High | Clickable `<tr>` rows (dashboard tables + pipeline desktop table) were not keyboard-operable. | Rows are now `role="button" tabIndex=0` with Enter/Space handlers. |
| 4 | High | `--grey-2` label text failed AA in both themes (~2.7–2.9:1) across every procurement label. | Procurement labels switched to `--grey` (≈4.75–6.4:1). |
| 5 | Med | Realization brief leakage used all-initiative leakage while its own evidence and the risk brief used realizing-stage leakage. | Aligned on `leak.total` — now $1.15M everywhere. |
| 6 | Med | Amber inline "evidence gap" count failed AA in light theme. | Switched to `--brand-energy` (tuned dark gold, ~5.35:1 light). |
| 7 | Low | `sort()` mutated a memoized `risks` array in render (Opportunity Workspace). | Copy-before-sort (`[...o.risks]`). |
| 8 | Low | Dead `r.forecastRA` key (always undefined); sustainment insight said "the case justifies the move" with no further gate. | Forecast aligned on the `forecastCurve` source; sustained opportunities now read "protect the run-rate." |

**Cleared (not defects):** decision mutations are entitlement-gated (`canApproveRoles` /
`canRequestAdvance`); the anchor-capability invariant is enforced in engine + UI; Settings
toggles are admin-only; no dead-end routes; determinism clean (no wall clock / random); "AI"
copy is explicitly rules-based; motion honors reduced-motion; responsive layout sound at 390px.

## 6. Acceptance criteria (brief §17)

- EVRO remains one coherent platform — ✓ (one shell, identity, engine, data model).
- Procurement is clearly the first active capability, not a separate product — ✓ (framing + capability model).
- Future modules reactivate through configuration — ✓ (Settings capability toggles; full nav intact).
- Executives understand status, confidence, risk and next decisions in <5s — ✓ (dashboard + narrative).
- One shared savings lifecycle and definition set — ✓ (11 stages + 8 definitions).
- Board-demo ready — ✓ (`EVRO_Procurement_Board_Demo.md`).
- Architecture reusable for Fleet / Operations / CX / HR / Finance / Sales — ✓ (capability model + reusable value objects).
