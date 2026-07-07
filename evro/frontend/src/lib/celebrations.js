// Celebration Framework (6B item 11) — executive-grade celebration detection.
// After every successful mutation the detector diffs the org's provable state
// (milestones, maturity, decisions) before vs after and emits a celebration
// ONLY when something real was crossed. A local "seen" store keeps each
// milestone to one celebration per device; nothing is ever invented to
// celebrate. View-layer only.
import { orgMilestones, maturityModel } from './achievements.js'
import { enterpriseHealth } from './intel.js'

const LS = 'evro.celebrated'
const seen = () => { try { return new Set(JSON.parse(localStorage.getItem(LS) || '[]')) } catch { return new Set() } }
const markSeen = (keys) => { try { localStorage.setItem(LS, JSON.stringify([...new Set([...seen(), ...keys])])) } catch { /* ignore */ } }

// Compare before/after and return celebration payloads for what genuinely
// changed. `extra` lets callers add action-specific ceremonies (e.g. the
// mission-complete payload) into the same pipeline.
export function detectCelebrations(before, after, action, extra = []) {
  const out = [...extra]
  try {
    const msB = orgMilestones(before).milestones
    const msA = orgMilestones(after).milestones
    for (let k = 0; k < msA.length; k++) {
      if (msA[k].achieved && !msB[k]?.achieved) {
        out.push({ key: `ms:${msA[k].title}`, kind: 'milestone', icon: msA[k].icon, headline: 'Enterprise milestone', title: msA[k].title, detail: msA[k].detail })
      }
    }
    const matB = maturityModel(before)
    const matA = maturityModel(after)
    if (matA.level > matB.level) {
      out.push({ key: `mat:${matA.level}`, kind: 'maturity', icon: '⬆', headline: 'Operating maturity gained', title: `Level ${matA.level} · ${matA.name}`, detail: 'Every criterion of the level now holds — computed, not declared.' })
    }
    // Health recovered (6D Wave 6) — the enterprise-health grade band steps UP.
    // Threshold is the credit-style grade, so this fires only on a real
    // recovery across a band boundary, never on noise within a band.
    const hB = enterpriseHealth(before)
    const hA = enterpriseHealth(after)
    if (hA.score > hB.score && hA.grade !== hB.grade) {
      out.push({ key: `health:${hA.grade}`, kind: 'health', icon: '❤', headline: 'Enterprise health recovered', title: `${hB.grade} → ${hA.grade} · ${hA.gradeLabel}`, detail: `Health stepped up a grade band to ${hA.score}. The rings breathe steadier — a recovery the record can prove.` })
    }
    if (action === 'journalOutcome') {
      const n = (after.decision_journal || []).filter((d) => d.outcome).length
      out.push({ key: `learn:${n}`, once: false, kind: 'learning', icon: '💡', headline: 'The organization just learned something', title: 'Postmortem recorded', detail: 'Outcome and lesson are on the record — Memory feeds it back to every agent.' })
    }
  } catch { /* detection must never break the mutation path */ }

  // de-dupe against the device's seen store (unless the payload opts out)
  const s = seen()
  const fresh = out.filter((c) => c.once === false || !s.has(c.key))
  markSeen(fresh.filter((c) => c.once !== false).map((c) => c.key))
  return fresh
}

export const resetCelebrations = () => { try { localStorage.removeItem(LS) } catch { /* ignore */ } }
