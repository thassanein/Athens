import { useState } from 'react'
import { exportCSV, exportPDF, exportPPTX } from '../lib/procurement-export.js'

// ExportMenu — the extraction point. One button, three formats: Excel (CSV),
// PDF (printable report) and PowerPoint (.pptx board deck). Every export is a
// faithful snapshot of the deterministic model.
export default function ExportMenu({ db, flash, label = 'Export' }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const run = async (kind) => {
    setOpen(false)
    try {
      if (kind === 'csv') { const n = exportCSV(db); flash?.(`Exported ${n} opportunities to Excel (CSV)`) }
      else if (kind === 'pdf') { exportPDF(db); flash?.('Opening printable PDF report…') }
      else if (kind === 'pptx') { setBusy(true); flash?.('Building PowerPoint…'); const f = await exportPPTX(db); flash?.(`Saved ${f}`) }
    } catch { flash?.('Export failed — please try again') } finally { setBusy(false) }
  }
  return (
    <span className="expm">
      <button className="btn sm" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} disabled={busy}>
        ⬇ {busy ? 'Exporting…' : label} ▾
      </button>
      {open && (
        <>
          <div className="expm-scrim" onClick={() => setOpen(false)} />
          <div className="expm-menu" role="menu">
            <button role="menuitem" onClick={() => run('csv')}>Excel <span>.csv</span></button>
            <button role="menuitem" onClick={() => run('pdf')}>PDF <span>print</span></button>
            <button role="menuitem" onClick={() => run('pptx')}>PowerPoint <span>.pptx</span></button>
          </div>
        </>
      )}
    </span>
  )
}
