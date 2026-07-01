// Regenerates src/lib/sitedata.js — the bundled portfolio snapshot the app
// falls back to when the API is unreachable. Source of truth is the canonical
// repo-root data/sitedata.json. Run: npm run gen:snapshot
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../data/sitedata.json')
const out = resolve(here, '../src/lib/sitedata.js')

const data = JSON.parse(readFileSync(src, 'utf8'))

// SECURITY (temporary lockdown): the snapshot ships inside the public JS bundle,
// so strip every external document-store (SharePoint) URL out of it. Document
// names are kept; only the links (folder / siteMap / documents[].url /
// permits[].doc) are removed. data/sitedata.json keeps the URLs as the source of
// record — to restore, delete this block and re-run gen:snapshot.
for (const site of Object.values(data)) {
  delete site.folder
  delete site.siteMap
  if (Array.isArray(site.documents)) site.documents = site.documents.map((d) => ({ name: d.name }))
  for (const p of site.permits || []) delete p.doc
}

const banner = `// AUTO-GENERATED from data/sitedata.json by scripts/gen-snapshot.mjs — do not edit by hand.
// Bundled offline snapshot: used when GET /api/sites is unreachable (demo / offline mode).
// External document-store (SharePoint) links are intentionally stripped here — see gen-snapshot.mjs.
`
writeFileSync(out, banner + 'export const SNAPSHOT = ' + JSON.stringify(data, null, 2) + '\n')
console.log('Wrote', out)
