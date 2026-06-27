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
const banner = `// AUTO-GENERATED from data/sitedata.json by scripts/gen-snapshot.mjs — do not edit by hand.
// Bundled offline snapshot: used when GET /api/sites is unreachable (demo / offline mode).
`
writeFileSync(out, banner + 'export const SNAPSHOT = ' + JSON.stringify(data, null, 2) + '\n')
console.log('Wrote', out)
