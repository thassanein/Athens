// Executive Decision Workspace (5B.7 item 9) — one case file per high-value
// pending decision: the ask, the evidence, the alternatives with their
// deterministic consequences, an approve-vs-delay simulation, and an AI debate
// (FOR/AGAINST positions composed from the live agent signals and portfolio
// state — rules-based, no LLM). Actions map to EXISTING mutations only
// (approveRequest / rejectRequest / addTask); journaling is automatic via the
// app-level auto-journal.
import {
  STAGES, STAGE_LABEL, confidence, financials, gateCheck, canApproveRoles,
  rav, worstRisk, personName, MATERIALITY,
} from './engine.js'
import { aiRecommendations } from './model.js'
import { explainability } from './evidence.js'

const daysSince = (db, iso) => {
  if (!iso) return null
  const d = (new Date(db.meta?.now || '2026-06-30') - new Date(String(iso).slice(0, 10))) / 86400000
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null
}

export function decisionCases(db, user) {
  const recs = aiRecommendations(db, { status: 'open' })
  return db.initiatives
    .filter((i) => i.request)
    .map((i) => {
      const req = i.request
      const toStage = req.kind === 'intake' ? 'idea' : req.to_stage
      const c1 = confidence(i.stage), c2 = confidence(toStage)
      const fin = financials(i, db)
      const gate = gateCheck(i)
      const roles = canApproveRoles(user, i)
      const filled = (req.approvals || []).map((a) => a.role)
      const waiting = (req.need || []).filter((r) => !filled.includes(r))

      // simulation — approve now vs hold: the confidence step moves rav; a
      // 3-month delay costs a quarter of the incremental run-rate (labelled).
      const ravNow = rav(i)
      const ravNext = i.gross_annual_value * c2 * (i.realization_factor ?? 1)
      const unlock = Math.max(0, ravNext - ravNow)
      const delayCost = unlock * (3 / 12)

      // the AI debate — positions composed from agent signals + portfolio state
      const linked = recs.filter((r) => r.linked_id === i.id)
      const pro = []
      const con = []
      for (const r of linked) (['risk', 'governance'].includes(r.category) ? con : pro).push({ agent: r.agent, text: r.recommendation, confidence: r.confidence, rec: r })
      if (fin.roi > 0) pro.push({ agent: 'Advisor', text: `Return efficiency ${fin.roi.toFixed(1)}× with ${fin.paybackMonths ? Math.round(fin.paybackMonths) + '-month payback' : 'no payback data'} — approving moves ${moneyish(unlock)} into the credible pipeline.`, confidence: 0.75 })
      if (fin.recurringRatio > 0.5) pro.push({ agent: 'Realization Agent', text: `${Math.round(fin.recurringRatio * 100)}% of the benefit is recurring — durable run-rate, not a one-off.`, confidence: 0.8 })
      if (!gate.ok) con.push({ agent: 'Governance', text: `Gate check fails: ${gate.reasons.join(' ')}`, confidence: 0.95 })
      if (worstRisk(i) >= 15) con.push({ agent: 'Risk Agent', text: `Worst open risk scores ${worstRisk(i)}/25 — approve only with the countermeasure resourced.`, confidence: 0.85 })
      if (gate.requiresSteering) con.push({ agent: 'Governance', text: `Gross ≥ ${moneyish(MATERIALITY)} — Steering sign-off is mandatory for Launch.`, confidence: 1 })
      const proConf = pro.length ? pro.reduce((a, x) => a + x.confidence, 0) / pro.length : 0
      const conConf = con.length ? con.reduce((a, x) => a + x.confidence, 0) / con.length : 0
      const verdict = !con.length ? 'approve' : !pro.length ? 'hold' : proConf >= conConf ? 'approve' : 'hold'

      return {
        id: i.id, title: i.title, owner: personName(db, i.owner_id), ownerId: i.owner_id,
        dept: i.department, stage: i.stage, toStage, kind: req.kind,
        ask: req.kind === 'intake' ? 'Approve into the pipeline' : `Advance ${STAGE_LABEL[i.stage]} → ${STAGE_LABEL[toStage]}`,
        value: i.gross_annual_value, requestedBy: personName(db, req.requested_by), ageDays: daysSince(db, req.requested_at),
        canApprove: roles.length > 0, roles, waiting,
        fin, gate,
        evidence: {
          validations: (i.validations || []).length,
          baseline: !!i.baseline?.validated_by,
          risks: (i.risks || []).filter((r) => r.status !== 'closed').length,
          worstRisk: worstRisk(i),
          trust: linked.length ? explainability(db, linked[0]) : null,
          linkedRec: linked[0] || null,
        },
        sim: { unlock, delayCost, c1, c2, ravNow, ravNext },
        debate: { pro, con, proConf, conConf, verdict },
      }
    })
    .sort((a, b) => b.value - a.value)
}

const moneyish = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`)

export const ALTERNATIVES = [
  { key: 'approve', label: 'Approve now', tone: 'green',
    consequence: (c) => `Confidence steps ${Math.round(c.sim.c1 * 100)}% → ${Math.round(c.sim.c2 * 100)}% — ${moneyish(c.sim.unlock)} moves into the credible pipeline.` },
  { key: 'return', label: 'Return for rework', tone: 'amber',
    consequence: (c) => c.gate.ok ? 'Gate criteria are met — returning costs momentum without a stated gap.' : `Send back with the gate gaps named: ${c.gate.reasons.join(' ')}` },
  { key: 'delegate', label: 'Delegate the diligence', tone: 'navy',
    consequence: (c) => `Puts a review task on ${c.owner}'s record via the standard workflow — the decision stays with you.` },
  { key: 'defer', label: 'Hold 90 days', tone: 'grey',
    consequence: (c) => `Timing cost ≈ ${moneyish(c.sim.delayCost)} of run-rate (3 of 12 months on the unlocked value — illustrative).` },
]
