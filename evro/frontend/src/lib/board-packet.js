// Athens EVRO — Board-packet PowerPoint export (view-only). Renders the exact
// same deterministic story beats the on-screen presenter shows into a native
// .pptx, using the dark cockpit palette. pptxgenjs is loaded via dynamic
// import() so it becomes a lazy code-split chunk (kept out of the main bundle).
// Presentation only — no engine / mutations / server / data change.
import { storyBeats } from './story.js'

// Dark cockpit palette (hex without '#'), mirrored from the CSS design tokens.
const HEX = {
  bg: '0E0E11', card: '141820', alt: '10141B', panel: '1B2430', ink: 'F4F4F6', soft: 'C8D2DF',
  red: 'E5243B', navy: '4F8DF2', green: '3FC97F', amber: 'F2B23E', opp: 'A874F5',
  grey: '8B97A8', line: '2A3340',
}
const toneHex = (t) => ({ green: HEX.green, navy: HEX.navy, red: HEX.red, amber: HEX.amber, opp: HEX.opp, grey: HEX.grey }[t] || HEX.ink)
const FONT = 'Archivo'

// Relative column widths by header, normalized to the table width.
const COLW = {
  Initiative: 3, Item: 2.4, Person: 2, 'Category group': 2.4, Countermeasure: 2.6, Detail: 3,
  Stage: 1.4, Band: 1.2, Level: 1.4, Score: 1, Status: 1.4, Inflation: 1.2, Exposure: 1.5,
  Realized: 1.5, 'Realized YTD': 1.6, Expected: 1.5, 'Risk-adj value': 1.7, 'Total FY': 1.5,
  Value: 1.4, 'vs plan': 1.2, Type: 1.3,
}
function colWidths(cols, total) {
  const w = cols.map((c) => COLW[c] || 1.5)
  const sum = w.reduce((a, b) => a + b, 0)
  return w.map((x) => +(total * (x / sum)).toFixed(2))
}

function coverSlide(pptx, b) {
  const s = pptx.addSlide({ masterName: 'EVRO' })
  s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 0.5, w: 1.05, h: 1.05, rectRadius: 0.13, fill: { color: HEX.red } })
  s.addText('EV', { x: 0.5, y: 0.5, w: 1.05, h: 1.05, align: 'center', valign: 'middle', fontSize: 32, bold: true, color: 'FFFFFF', fontFace: FONT })
  s.addText('ATHENS EVRO', { x: 1.75, y: 0.6, w: 9, h: 0.4, fontSize: 15, bold: true, color: HEX.ink, charSpacing: 2, fontFace: FONT })
  s.addText('Enterprise Value Realization Operating System', { x: 1.75, y: 1.0, w: 10, h: 0.4, fontSize: 12, color: HEX.grey, fontFace: FONT })
  s.addText(b.lbl, { x: 0.5, y: 3.0, w: 12.3, h: 0.4, fontSize: 14, bold: true, color: HEX.red, charSpacing: 2, fontFace: FONT })
  s.addText(b.title, { x: 0.5, y: 3.4, w: 12.3, h: 1.0, fontSize: 40, bold: true, color: HEX.ink, fontFace: FONT })
  s.addText(b.cap, { x: 0.5, y: 4.5, w: 12.3, h: 0.5, fontSize: 16, color: HEX.soft, fontFace: FONT })
  if (b.sub) s.addText(b.sub, { x: 0.5, y: 5.15, w: 12.3, h: 0.5, fontSize: 15, italic: true, color: toneHex(b.tone), fontFace: FONT })
  return s
}

function closingSlide(pptx, b) {
  const s = pptx.addSlide({ masterName: 'EVRO' })
  s.addText(b.lbl, { x: 0.5, y: 2.55, w: 12.3, h: 0.4, align: 'center', fontSize: 14, bold: true, color: HEX.red, charSpacing: 2, fontFace: FONT })
  s.addText(b.title, { x: 0.5, y: 2.95, w: 12.3, h: 0.9, align: 'center', fontSize: 34, bold: true, color: HEX.ink, fontFace: FONT })
  if (b.cap) s.addText(b.cap, { x: 0.5, y: 3.9, w: 12.3, h: 0.5, align: 'center', fontSize: 16, color: HEX.amber, fontFace: FONT })
  if (b.sub) s.addText(b.sub, { x: 1.5, y: 4.55, w: 10.3, h: 1.4, align: 'center', fontSize: 14, color: HEX.soft, fontFace: FONT, lineSpacingMultiple: 1.25 })
  return s
}

// Chapter / act divider — a full-bleed section slide announcing the next act.
function dividerSlide(pptx, chapter, act) {
  const s = pptx.addSlide({ masterName: 'EVRO' })
  s.background = { color: HEX.alt }
  s.addText(`ACT ${act}`, { x: 0.9, y: 3.0, w: 11.5, h: 0.5, fontSize: 15, bold: true, color: HEX.red, charSpacing: 3, fontFace: FONT })
  s.addText(chapter, { x: 0.9, y: 3.45, w: 11.5, h: 1.1, fontSize: 44, bold: true, color: HEX.ink, fontFace: FONT })
  s.addShape(pptx.ShapeType.line, { x: 0.95, y: 4.7, w: 3.2, h: 0, line: { color: HEX.red, width: 2.5 } })
  return s
}

function addTable(pptx, s, t) {
  const total = 6.33
  const header = t.cols.map((c, i) => ({
    text: c, options: { bold: true, color: 'FFFFFF', fill: { color: HEX.panel }, align: t.align?.[i] === 'r' ? 'right' : 'left', fontSize: 11 },
  }))
  const body = t.rows.map((r, ri) => r.map((cell, ci) => ({
    text: String(cell), options: { color: HEX.ink, fill: { color: ri % 2 ? HEX.card : HEX.alt }, align: t.align?.[ci] === 'r' ? 'right' : 'left', fontSize: 10.5 },
  })))
  s.addTable([header, ...body], {
    x: 6.5, y: 1.85, w: total, colW: colWidths(t.cols, total),
    border: { type: 'solid', pt: 0.5, color: HEX.line }, align: 'left', valign: 'middle',
    fontFace: FONT, rowH: 0.4, margin: 3, autoPage: false,
  })
}

function beatSlide(pptx, b) {
  const s = pptx.addSlide({ masterName: 'EVRO' })
  s.addText(b.lbl, { x: 0.5, y: 0.4, w: 12.3, h: 0.35, fontSize: 13, bold: true, color: HEX.red, charSpacing: 1, fontFace: FONT })
  s.addText(b.title, { x: 0.5, y: 0.75, w: 12.3, h: 0.7, fontSize: 28, bold: true, color: HEX.ink, fontFace: FONT })
  s.addShape(pptx.ShapeType.line, { x: 0.5, y: 1.6, w: 12.33, h: 0, line: { color: HEX.line, width: 1 } })

  const hasTable = !!b.table
  const leftW = hasTable ? 5.5 : 8.2
  let ly = 1.85
  if (b.big != null) {
    s.addText(String(b.big), { x: 0.5, y: ly, w: leftW, h: 1.1, fontSize: hasTable ? 40 : 52, bold: true, color: toneHex(b.tone), fontFace: FONT })
    ly += hasTable ? 1.0 : 1.15
    if (b.cap) { s.addText(b.cap, { x: 0.5, y: ly, w: leftW, h: 0.7, fontSize: 12.5, color: HEX.grey, fontFace: FONT, lineSpacingMultiple: 1.1 }); ly += 0.72 }
  } else if (b.cap) {
    s.addText(b.cap, { x: 0.5, y: ly, w: leftW, h: 0.5, fontSize: 13, color: HEX.grey, fontFace: FONT }); ly += 0.55
  }
  if (b.sub) {
    s.addText(b.sub, { x: 0.5, y: ly, w: leftW, h: 1.9, fontSize: 14, color: HEX.soft, fontFace: FONT, lineSpacingMultiple: 1.2, valign: 'top' })
    ly += 1.85
  }
  if (b.bullets && b.bullets.length) {
    const bulletW = hasTable ? leftW : 11.8
    s.addText(b.bullets.map((t) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: true } })),
      { x: 0.5, y: ly, w: bulletW, h: 2.4, fontSize: hasTable ? 12 : 14, color: HEX.ink, fontFace: FONT, lineSpacingMultiple: 1.25, valign: 'top' })
  }
  if (hasTable) addTable(pptx, s, b.table)
  return s
}

// Build + download a .pptx board packet for the given audience/period. Returns
// the filename. Any thrown error should be surfaced to the user by the caller.
export async function exportBoardPacket(db, opts = {}) {
  const { audience = 'board', period = 'fy' } = opts
  const mod = await import('pptxgenjs')
  const PptxGenJS = mod.default || mod
  const beats = storyBeats(db, opts)

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 × 7.5 in
  pptx.author = 'Athens EVRO'
  pptx.company = 'Athens Services'
  pptx.subject = 'Enterprise Value Realization'
  pptx.title = `Athens EVRO — ${audience} board packet · FY${db.meta.fiscalYear}`

  pptx.defineSlideMaster({
    title: 'EVRO', background: { color: HEX.bg },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.11, fill: { color: HEX.red } } },
      { text: { text: 'Athens EVRO · Value Realization OS', options: { x: 0.5, y: 7.06, w: 6, h: 0.3, fontSize: 9, color: HEX.grey, fontFace: FONT } } },
      { text: { text: 'AI · rules-based · deterministic · value counts only once FP&A validates it', options: { x: 5.0, y: 7.06, w: 7.83, h: 0.3, fontSize: 9, color: HEX.grey, align: 'right', fontFace: FONT } } },
    ],
  })

  // Render cover, then chapter-dividered beats, then close — with a speaker
  // note on every slide (the operating-review arc from Story Mode 2.0).
  let lastChapter = null
  let act = 0
  for (const b of beats) {
    let slide
    if (b.type === 'cover') { slide = coverSlide(pptx, b); lastChapter = b.chapter }
    else if (b.type === 'closing') slide = closingSlide(pptx, b)
    else {
      if (b.chapter && b.chapter !== lastChapter) { act += 1; dividerSlide(pptx, b.chapter, act); lastChapter = b.chapter }
      slide = beatSlide(pptx, b)
    }
    if (slide && b.note) { try { slide.addNotes(b.note) } catch { /* notes optional */ } }
  }

  const fileName = `EVRO_Board_Packet_${audience}_${period}_FY${db.meta.fiscalYear}.pptx`
  await pptx.writeFile({ fileName })
  return fileName
}
