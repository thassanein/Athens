import { useMemo, useState } from 'react'
import { PERMIT_LABEL, FINDING_LABEL, isOpenWork } from '../lib/derive.js'
import { templateKeyForType } from '../lib/audit-templates.js'
import { IconPin, IconChevron } from '../components/Icons.jsx'

// ---------------------------------------------------------------------------
// A living, data-driven facility plan. Unlike the old generic schematic, the
// zones here are the REAL functional / cert areas of each facility type, and
// every zone is tied to the permits that govern it (SWFP, CUPA, SPCC,
// Stormwater, WDR, Air …). A zone's colour is the worst status of the permits
// (and open findings) that land in it, so the map reads as the site's live
// compliance footprint. It is gently animated — zones fade in, attention areas
// pulse, a radar sweep scans the yard, and a truck tracks the entrance route.
// ---------------------------------------------------------------------------

// 4×4 grid → pixel rect inside a 360×300 viewBox.
const VB_W = 360,
  VB_H = 300,
  PAD = 14,
  GAP = 8,
  COLS = 4,
  ROWS = 4
const CELL_W = (VB_W - PAD * 2 - GAP * (COLS - 1)) / COLS
const CELL_H = (VB_H - PAD * 2 - GAP * (ROWS - 1)) / ROWS
const rect = (c, r, cw = 1, rh = 1) => ({
  x: PAD + c * (CELL_W + GAP),
  y: PAD + r * (CELL_H + GAP),
  w: cw * CELL_W + (cw - 1) * GAP,
  h: rh * CELL_H + (rh - 1) * GAP,
})

// Each zone declares the permit `area` values it governs (`covers`). The first
// zone tagged kind:'core' is the catch-all for any permit that matches nothing.
const Z = (key, label, kind, cell, covers = []) => ({ key, label, kind, ...rect(...cell), covers })

const LAYOUTS = {
  hauling: [
    Z('storm', 'Stormwater', 'env', [0, 0, 3, 1], ['Stormwater']),
    Z('fuel', 'Fuel / CNG', 'support', [3, 0, 1, 1], ['SPCC', 'Air Permits']),
    Z('yard', 'Truck Yard', 'core', [0, 1, 3, 2], ['SWFP', 'SWFP (SBC)']),
    Z('maint', 'Maint. Shop', 'support', [3, 1, 1, 1], []),
    Z('wash', 'Wash / Clarifier', 'env', [3, 2, 1, 1], ['Wastewater', 'Wastewater (clarifier)', 'WDR', 'WDR (SBC)', 'WCP']),
    Z('admin', 'Admin', 'support', [0, 3, 1, 1], []),
    Z('scale', 'Scale / Entrance', 'gate', [1, 3, 2, 1], ['CUP', 'CUP land use', 'CDFA Weighmaster', 'JTD', 'County SB Public Health']),
    Z('haz', 'HazMat / CUPA', 'haz', [3, 3, 1, 1], ['CUPA', 'EPA ID', 'Waste Tire']),
  ],
  mrf: [
    Z('storm', 'Stormwater', 'env', [0, 0, 3, 1], ['Stormwater']),
    Z('air', 'Air / Vent', 'support', [3, 0, 1, 1], ['Air Permits']),
    Z('tip', 'Tipping Floor', 'core', [0, 1, 2, 2], ['SWFP', 'SWFP (SBC)']),
    Z('sort', 'Sort Line', 'core', [2, 1, 1, 2], []),
    Z('haz', 'HazMat / CUPA', 'haz', [3, 1, 1, 1], ['CUPA', 'EPA ID', 'Waste Tire']),
    Z('wash', 'Wash / Clarifier', 'env', [3, 2, 1, 1], ['Wastewater', 'Wastewater (clarifier)', 'WDR', 'SPCC']),
    Z('baler', 'Baler / Bunkers', 'support', [0, 3, 1, 1], []),
    Z('scale', 'Scale / Entrance', 'gate', [1, 3, 2, 1], ['CUP', 'CDFA Weighmaster', 'County SB Public Health', 'JTD']),
    Z('admin', 'Admin', 'support', [3, 3, 1, 1], []),
  ],
  ts: [
    Z('storm', 'Stormwater', 'env', [0, 0, 2, 1], ['Stormwater']),
    Z('haz', 'HazMat / CUPA', 'haz', [2, 0, 1, 1], ['CUPA', 'EPA ID']),
    Z('fuel', 'Fuel / SPCC', 'support', [3, 0, 1, 1], ['SPCC', 'Air Permits']),
    Z('tip', 'Tipping Floor', 'core', [0, 1, 3, 2], ['SWFP', 'SWFP (SBC)']),
    Z('load', 'Transfer / Load-out', 'support', [3, 1, 1, 2], []),
    Z('admin', 'Admin', 'support', [0, 3, 1, 1], []),
    Z('scale', 'Scale / Entrance', 'gate', [1, 3, 2, 1], ['CUP', 'CDFA Weighmaster', 'County SB Public Health', 'JTD']),
    Z('maint', 'Maint. Shop', 'support', [3, 3, 1, 1], []),
  ],
  landfill: [
    Z('storm', 'Stormwater', 'env', [0, 0, 2, 1], ['Stormwater']),
    Z('lfg', 'LFG / Flare', 'support', [2, 0, 2, 1], ['Air Permits']),
    Z('face', 'Working Face', 'core', [0, 1, 2, 2], ['SWFP', 'SWFP (SBC)']),
    Z('leach', 'Leachate / Ponds', 'env', [2, 1, 2, 1], ['WDR', 'WDR (SBC)', 'Wastewater']),
    Z('equip', 'Equipment Yard', 'support', [2, 2, 1, 1], []),
    Z('haz', 'HazMat / CUPA', 'haz', [3, 2, 1, 1], ['CUPA', 'EPA ID']),
    Z('admin', 'Admin', 'support', [0, 3, 1, 1], []),
    Z('scale', 'Scale / Entrance', 'gate', [1, 3, 3, 1], ['CUP', 'CDFA Weighmaster', 'County SB Public Health', 'JTD', 'Waste Tire']),
  ],
  organics: [
    Z('recv', 'Receiving', 'core', [0, 0, 2, 1], ['SWFP (SBC)']),
    Z('air', 'Air / Biofilter', 'support', [2, 0, 2, 1], ['Air Permits']),
    Z('wind', 'Windrows / ASP', 'core', [0, 1, 3, 2], ['SWFP']),
    Z('ponds', 'Ponds / Stormwater', 'env', [3, 1, 1, 2], ['Stormwater', 'WDR']),
    Z('haz', 'HazMat / CUPA', 'haz', [0, 3, 1, 1], ['CUPA', 'EPA ID', 'SPCC']),
    Z('scale', 'Scale / Entrance', 'gate', [1, 3, 2, 1], ['CUP', 'CDFA Weighmaster', 'County SB Public Health']),
    Z('cure', 'Curing / Screen', 'support', [3, 3, 1, 1], []),
  ],
  facility: [
    Z('park', 'Parking / Yard', 'env', [0, 0, 2, 1], ['Stormwater']),
    Z('air', 'Air / Engines', 'support', [2, 0, 2, 1], ['Air Permits']),
    Z('bldg', 'Building', 'core', [0, 1, 4, 2], []),
    Z('haz', 'HazMat / CUPA', 'haz', [0, 3, 1, 1], ['CUPA', 'EPA ID']),
    Z('scale', 'Entrance', 'gate', [1, 3, 2, 1], ['CUP', 'County SB Public Health']),
    Z('store', 'Storage / Tanks', 'support', [3, 3, 1, 1], ['SPCC']),
  ],
}

// Single clean "plan" palette. (The toggle now switches the data lens, not the
// cosmetic skin, so the old blueprint/terrain themes were dropped.)
const STYLES = {
  plan: { bg: '#F4F6F9', grid: null, text: '#46566B', sub: '#7C8AA0', stroke: '#D2DAE4' },
}
// Base tint per zone kind (before status colouring).
const KIND_TINT = {
  plan: { core: '#E4ECF6', env: '#E3F0EA', haz: '#F6ECE2', gate: '#ECEAF6', support: '#EAEEF3' },
}
const TONE_HEX = { fail: '#D5172A', open: '#B7791F', pass: '#1A5632', idle: '#9AA7B6' }
const RAG_HEX = { active: '#1A5632', renew: '#B7791F', verify: '#D5172A' }
const sev = { verify: 3, renew: 2, active: 1 }

// Assign every permit to a zone, compute each zone's worst-case tone, and pin
// open findings whose area matches a zone label.
function buildModel(site, layout) {
  const core = layout.find((z) => z.kind === 'core') || layout[0]
  const permits = site.permits || []
  const findings = (site.checklist || []).filter(isOpenWork)
  const byZone = Object.fromEntries(layout.map((z) => [z.key, { zone: z, permits: [], findings: [] }]))

  for (const p of permits) {
    const hit = layout.find((z) => z.covers.includes(p.area)) || core
    byZone[hit.key].permits.push(p)
  }
  for (const f of findings) {
    const hit = layout.find((z) => z.label === f.area)
    if (hit) byZone[hit.key].findings.push(f)
  }
  const RANK = { idle: 0, pass: 1, open: 2, fail: 3 }
  for (const k of Object.keys(byZone)) {
    const e = byZone[k]
    // Permit lens: worst RAG status of the permits governing this zone.
    let pworst = 0
    for (const p of e.permits) pworst = Math.max(pworst, sev[p.status] || 0)
    e.permitTone = pworst >= 3 ? 'fail' : pworst === 2 ? 'open' : pworst === 1 ? 'pass' : 'idle'
    // Findings lens: open work logged to this area.
    e.findingTone = e.findings.some((f) => f.status === 'fail') ? 'fail' : e.findings.length ? 'open' : 'idle'
    // Status lens: the worse of the two.
    e.statusTone = RANK[e.findingTone] > RANK[e.permitTone] ? e.findingTone : e.permitTone
    e.count = e.permits.length + e.findings.length
  }
  return byZone
}

// Which tone a zone shows for the selected lens.
const toneFor = (e, lens) => (lens === 'permits' ? e.permitTone : lens === 'findings' ? e.findingTone : e.statusTone)
const LENSES = [
  { key: 'status', label: 'Status' },
  { key: 'permits', label: 'Permits' },
  { key: 'findings', label: 'Findings' },
]

const centerOf = (z) => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 })

// Fit a zone label to its width: one line if it fits, else wrap onto two
// (preferring the " / " break, then the nearest space) so narrow zones never
// overflow into their neighbours.
function fitLabel(label, w) {
  const max = Math.max(7, Math.floor((w - 14) / 5.1))
  if (label.length <= max) return [label]
  const slash = label.split(' / ')
  if (slash.length === 2 && slash[0].length <= max && slash[1].length <= max) return slash
  let l1 = '',
    l2 = ''
  for (const word of label.split(' ')) {
    if (!l2 && (l1 ? l1.length + 1 + word.length : word.length) <= max) l1 = l1 ? `${l1} ${word}` : word
    else l2 = l2 ? `${l2} ${word}` : word
  }
  return l2 ? [l1, l2] : [l1]
}

export default function FacilityMap({ site, type, onCapture, onOpenPermit }) {
  const [lens, setLens] = useState('status') // status | permits | findings
  const [selKey, setSelKey] = useState(null)
  const layout = LAYOUTS[templateKeyForType(type)] || LAYOUTS.hauling
  const S = STYLES.plan
  const tint = KIND_TINT.plan
  const model = useMemo(() => buildModel(site, layout), [site, layout])

  const gate = layout.find((z) => z.kind === 'gate')
  const core = layout.find((z) => z.kind === 'core') || layout[0]
  const route = gate && core ? `M ${centerOf(gate).x} ${centerOf(gate).y} L ${centerOf(core).x} ${centerOf(core).y}` : null
  const attention = layout.filter((z) => toneFor(model[z.key], lens) === 'fail').length
  const showPermits = lens !== 'findings'
  const showFindings = lens !== 'permits'
  const sel = selKey ? model[selKey] : null

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        <div style={{ aspectRatio: '360 / 300' }}>
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" role="img" aria-label={`${site.name || 'Site'} facility plan`}>
            <defs>
              <radialGradient id="fm-sweep" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(26,86,50,.18)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>
            <rect width={VB_W} height={VB_H} fill={S.bg} />
            {/* blueprint grid */}
            {S.grid &&
              Array.from({ length: 19 }).map((_, i) => (
                <g key={i} stroke={S.grid} strokeWidth="1">
                  <line x1={i * 20} y1="0" x2={i * 20} y2={VB_H} />
                  <line x1="0" y1={i * 16} x2={VB_W} y2={i * 16} />
                </g>
              ))}

            {/* radar sweep — slow rotating wedge over the whole yard */}
            <g style={{ pointerEvents: 'none' }} opacity="0.9">
              <g transform={`translate(${VB_W / 2} ${VB_H / 2})`}>
                <path d={`M0 0 L${VB_W * 0.62} -34 A${VB_W * 0.62} ${VB_W * 0.62} 0 0 1 ${VB_W * 0.62} 34 Z`} fill="url(#fm-sweep)">
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="9s" repeatCount="indefinite" />
                </path>
              </g>
            </g>

            {/* entrance route + a truck tracking it */}
            {route && (
              <>
                <path d={route} stroke={S.stroke} strokeWidth="2" strokeDasharray="3 5" fill="none" opacity="0.7" />
                <g>
                  <rect x="-4" y="-3" width="8" height="6" rx="1.5" fill="#1A2736" />
                  <animateMotion dur="6s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" path={route} rotate="auto" />
                </g>
              </>
            )}

            {/* zones */}
            {layout.map((z, i) => {
              const e = model[z.key]
              const tone = toneFor(e, lens)
              const isSel = selKey === z.key
              const toneHex = TONE_HEX[tone]
              const fill = tone === 'idle' ? tint[z.kind] : `${toneHex}22`
              return (
                <g
                  key={z.key}
                  onClick={() => setSelKey(isSel ? null : z.key)}
                  style={{ cursor: 'pointer' }}
                  opacity="0"
                >
                  <animate attributeName="opacity" from="0" to="1" dur="0.45s" begin={`${i * 0.06}s`} fill="freeze" />
                  <rect
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx="8"
                    fill={fill}
                    stroke={isSel ? toneHex : tone === 'idle' ? S.stroke : toneHex}
                    strokeWidth={isSel ? 2.5 : tone === 'idle' ? 1.25 : 1.75}
                  />
                  {/* status accent bar on the left edge */}
                  {tone !== 'idle' && <rect x={z.x} y={z.y + 6} width="4" height={z.h - 12} rx="2" fill={toneHex} />}
                  {/* pulsing ring for areas needing attention */}
                  {tone === 'fail' && (
                    <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="8" fill="none" stroke={toneHex} strokeWidth="2" style={{ pointerEvents: 'none' }}>
                      <animate attributeName="opacity" values="0.75;0.05;0.75" dur="2s" repeatCount="indefinite" />
                    </rect>
                  )}
                  <text x={z.x + 9} y={z.y + 15} fontSize="9" fontWeight="700" fill={S.text}>
                    {fitLabel(z.label, z.w).map((ln, k) => (
                      <tspan key={k} x={z.x + 9} dy={k === 0 ? 0 : 10}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                  {/* permit status dots along the bottom of the zone */}
                  {showPermits && e.permits.slice(0, 6).map((p, k) => (
                    <circle key={p.id} cx={z.x + 11 + k * 11} cy={z.y + z.h - 11} r="3.6" fill={RAG_HEX[p.status]} stroke="#fff" strokeWidth="1" />
                  ))}
                  {/* finding marker (rounded square) top-right */}
                  {showFindings && e.findings.length > 0 && (
                    <g>
                      <rect x={z.x + z.w - 18} y={z.y + 7} width="11" height="11" rx="3" fill={TONE_HEX.fail} stroke="#fff" strokeWidth="1.5" />
                      <text x={z.x + z.w - 12.5} y={z.y + 16} fontSize="8" fontWeight="800" fill="#fff" textAnchor="middle">
                        {e.findings.length}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* lens selector — recolours the zones by what you want to see */}
        <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', gap: 5 }}>
          {LENSES.map((l) => (
            <button
              key={l.key}
              onClick={() => setLens(l.key)}
              className="pill"
              style={{
                fontSize: 10,
                background: lens === l.key ? 'var(--navy)' : 'rgba(255,255,255,.92)',
                color: lens === l.key ? '#fff' : 'var(--navy)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

      </div>

      {/* attention status — below the map (avoids overlapping the selector on
          narrow phones); reflects the active lens. */}
      <div className="row spread" style={{ marginTop: 8, alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>
          {attention > 0 ? (
            <span style={{ color: 'var(--red)' }}>● {attention} area{attention > 1 ? 's' : ''} need attention</span>
          ) : (
            <span style={{ color: 'var(--green)' }}>● All areas clear</span>
          )}
        </span>
        <span className="muted" style={{ fontSize: 11 }}>
          {lens === 'permits' ? 'by permit status' : lens === 'findings' ? 'by open findings' : 'by overall status'}
        </span>
      </div>

      {/* selected-zone obligations */}
      {sel && (
        <div className="card" style={{ marginTop: 12, padding: '12px 14px' }}>
          <div className="row spread" style={{ marginBottom: 8 }}>
            <span className="h2" style={{ fontSize: 15 }}>
              {sel.zone.label}
            </span>
            <button className="label" onClick={() => onCapture(sel.zone.label)} style={{ color: 'var(--blue)' }}>
              + Log here
            </button>
          </div>
          {sel.permits.length === 0 && sel.findings.length === 0 && (
            <div className="muted" style={{ fontSize: 12.5 }}>
              No permits or open findings in this area.
            </div>
          )}
          {sel.permits.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpenPermit?.(p.id)}
              className="row spread"
              style={{ padding: '5px 0', width: '100%', background: 'none', border: 'none', cursor: onOpenPermit ? 'pointer' : 'default', textAlign: 'left', alignItems: 'center' }}
            >
              <span style={{ fontSize: 12.5 }}>
                <span className="dot" style={{ background: RAG_HEX[p.status], marginRight: 7 }} />
                {p.name}
                <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                  {p.area}
                </span>
              </span>
              <span className={`s-${p.status === 'active' ? 'pass' : 'fail'}`} style={{ fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {PERMIT_LABEL[p.status]} {onOpenPermit && <IconChevron size={12} />}
              </span>
            </button>
          ))}
          {sel.findings.map((f) => (
            <div key={f.id} className="row spread" style={{ padding: '5px 0' }}>
              <span style={{ fontSize: 12.5 }}>
                <span className="dot" style={{ background: TONE_HEX.fail, marginRight: 7 }} />
                {f.title}
              </span>
              <span className="s-fail" style={{ fontSize: 11.5, fontWeight: 700 }}>
                {FINDING_LABEL[f.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* hint */}
      {!sel && (
        <div className="muted" style={{ fontSize: 11.5, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPin size={12} /> Tap an area to see the permits and findings that govern it.
        </div>
      )}
    </>
  )
}
