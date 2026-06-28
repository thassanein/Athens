// Migration + data sync, safe to run on every server boot.
//   - Creates tables/indexes IF NOT EXISTS (never drops schema).
//   - Seeds from data/sitedata.json when the DB is empty, OR re-seeds when the
//     dataset changes (tracked by a content hash in app_meta.seed_hash). This
//     lets a new data push replace the live portfolio on the next deploy.
//
// NOTE: a re-seed REPLACES all portfolio rows (sites/permits/leases/findings).
// Intended for controlled data updates. Set AUTO_RESEED=false to disable the
// hash-triggered re-seed (then it only ever seeds an empty DB).
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import crypto from 'node:crypto'
import { pool } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.resolve(__dirname, '../../data/sitedata.json')

const DDL = `
CREATE TABLE IF NOT EXISTS sites (
  name   TEXT PRIMARY KEY,
  type   TEXT, swis TEXT, addr TEXT, city TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  anchor BOOLEAN DEFAULT false
);
CREATE TABLE IF NOT EXISTS permits (
  id TEXT PRIMARY KEY,
  site TEXT REFERENCES sites(name) ON DELETE CASCADE,
  name TEXT, agency TEXT, number TEXT,
  status TEXT CHECK (status IN ('active','renew','verify')),
  expires DATE, cycle TEXT, area TEXT
);
CREATE TABLE IF NOT EXISTS leases (
  id TEXT PRIMARY KEY,
  site TEXT REFERENCES sites(name) ON DELETE CASCADE,
  name TEXT, lessor TEXT,
  status TEXT CHECK (status IN ('active','renew','verify')),
  expires DATE, area TEXT
);
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  site TEXT REFERENCES sites(name) ON DELETE CASCADE,
  dept TEXT CHECK (dept IN ('Facility','ENV')),
  area TEXT, title TEXT,
  status TEXT CHECK (status IN ('pass','fail','open','na')),
  owner TEXT, due DATE, note TEXT, photo TEXT,
  source TEXT CHECK (source IN ('seed','field')) DEFAULT 'seed',
  lat DOUBLE PRECISION, lng DOUBLE PRECISION
);
CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);
CREATE INDEX IF NOT EXISTS idx_checklist_items_site ON checklist_items(site);
CREATE INDEX IF NOT EXISTS idx_permits_site ON permits(site);
CREATE INDEX IF NOT EXISTS idx_leases_site ON leases(site);
`

async function loadAll(client, data, { wipe }) {
  await client.query('BEGIN')
  try {
    if (wipe) await client.query('DELETE FROM sites') // CASCADE clears permits/leases/checklist
    let sites = 0, permits = 0, leases = 0, items = 0
    for (const [name, site] of Object.entries(data)) {
      await client.query(
        `INSERT INTO sites (name,type,swis,addr,city,lat,lng,anchor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [name, site.type ?? null, site.swis ?? null, site.addr ?? null, site.city ?? null, site.lat ?? null, site.lng ?? null, site.anchor ?? false]
      )
      sites++
      for (const p of site.permits ?? []) {
        await client.query(
          `INSERT INTO permits (id,site,name,agency,number,status,expires,cycle,area) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [p.id, name, p.name ?? null, p.agency ?? null, p.number ?? null, p.status ?? null, p.expires ?? null, p.cycle ?? null, p.area ?? null]
        )
        permits++
      }
      for (const l of site.leases ?? []) {
        await client.query(
          `INSERT INTO leases (id,site,name,lessor,status,expires,area) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [l.id, name, l.name ?? null, l.lessor ?? null, l.status ?? null, l.expires ?? null, l.area ?? null]
        )
        leases++
      }
      for (const c of site.checklist ?? []) {
        await client.query(
          `INSERT INTO checklist_items (id,site,dept,area,title,status,owner,due,note,photo,source,lat,lng)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [c.id, name, c.dept ?? null, c.area ?? null, c.title ?? null, c.status ?? null, c.owner ?? null, c.due ?? null, c.note ?? null, c.photo ?? null, c.source ?? 'seed', c.lat ?? null, c.lng ?? null]
        )
        items++
      }
    }
    await client.query('COMMIT')
    console.log(`[migrate] loaded ${sites} sites, ${permits} permits, ${leases} leases, ${items} checklist items.`)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

export async function migrate() {
  const client = await pool.connect()
  try {
    await client.query(DDL)
    const raw = await readFile(DATA_PATH, 'utf8')
    const hash = crypto.createHash('md5').update(raw).digest('hex')
    const { rows: cnt } = await client.query('SELECT COUNT(*)::int AS n FROM sites')
    const empty = cnt[0].n === 0
    const { rows: meta } = await client.query("SELECT value FROM app_meta WHERE key = 'seed_hash'")
    const stored = meta[0]?.value ?? null
    const autoReseed = process.env.AUTO_RESEED !== 'false'

    if (empty || (autoReseed && stored !== hash)) {
      console.log(`[migrate] ${empty ? 'empty DB' : 'dataset changed'} — loading portfolio…`)
      await loadAll(client, JSON.parse(raw), { wipe: !empty })
      await client.query(
        `INSERT INTO app_meta (key, value) VALUES ('seed_hash', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [hash]
      )
    } else {
      console.log(`[migrate] data unchanged (${cnt[0].n} sites) — no reseed.`)
    }
  } finally {
    client.release()
  }
}

// Allow running standalone: `node db/migrate.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().then(
    () => { console.log('[migrate] done.'); process.exit(0) },
    (err) => { console.error('[migrate] failed:', err); process.exit(1) }
  )
}
