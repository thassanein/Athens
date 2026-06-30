// Migration + seed, safe to run on every boot.
//   - Creates tables IF NOT EXISTS (never drops schema).
//   - Seeds from evro/data/seed.json when empty, OR re-seeds when the dataset
//     changes (content hash in app_meta.seed_hash). Set AUTO_RESEED=false to
//     only ever seed an empty DB.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import crypto from 'node:crypto'
import { pool } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.resolve(__dirname, '../../data/seed.json')

export const TABLES = ['krs', 'people', 'sourcing_groups', 'spend_categories', 'savings_pct_config', 'opportunities', 'initiatives', 'badges', 'points_ledger', 'audit_log']

export const DDL = `
CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS krs               (id TEXT PRIMARY KEY, data JSONB);
CREATE TABLE IF NOT EXISTS people            (id TEXT PRIMARY KEY, data JSONB);
CREATE TABLE IF NOT EXISTS sourcing_groups   (id TEXT PRIMARY KEY, data JSONB);
CREATE TABLE IF NOT EXISTS spend_categories  (id TEXT PRIMARY KEY, data JSONB);
CREATE TABLE IF NOT EXISTS savings_pct_config(group_id TEXT PRIMARY KEY, data JSONB);
CREATE TABLE IF NOT EXISTS opportunities     (id TEXT PRIMARY KEY, data JSONB);
CREATE TABLE IF NOT EXISTS initiatives       (id TEXT PRIMARY KEY, data JSONB);
CREATE TABLE IF NOT EXISTS badges            (id TEXT PRIMARY KEY, data JSONB);
CREATE TABLE IF NOT EXISTS points_ledger     (id TEXT PRIMARY KEY, data JSONB);
CREATE TABLE IF NOT EXISTS audit_log         (id TEXT PRIMARY KEY, data JSONB, ts TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log (ts DESC);
`

export async function migrate() {
  const raw = await readFile(DATA_PATH, 'utf8')
  const seed = JSON.parse(raw)
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  await pool.query(DDL)
  const have = (await pool.query('SELECT value FROM app_meta WHERE key=$1', ['seed_hash'])).rows[0]?.value
  const empty = (await pool.query('SELECT count(*)::int n FROM initiatives')).rows[0].n === 0
  const reseed = empty || (process.env.AUTO_RESEED !== 'false' && have !== hash)
  if (!reseed) { console.log('[migrate] schema ok; seed unchanged'); return }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const t of TABLES) await client.query(`DELETE FROM ${t}`)
    const ins = async (t, key, rows) => { for (const r of rows || []) await client.query(`INSERT INTO ${t}(${key}, data) VALUES ($1, $2)`, [r[key], r]) }
    await ins('krs', 'id', seed.krs)
    await ins('people', 'id', seed.people)
    await ins('sourcing_groups', 'id', seed.sourcing_groups)
    await ins('spend_categories', 'id', seed.spend_categories)
    await ins('savings_pct_config', 'group_id', seed.savings_pct_config)
    await ins('opportunities', 'id', seed.opportunities)
    await ins('initiatives', 'id', seed.initiatives)
    await ins('badges', 'id', seed.badges)
    await ins('points_ledger', 'id', seed.points_ledger)
    for (const r of seed.audit_log || []) await client.query('INSERT INTO audit_log(id, data, ts) VALUES ($1, $2, $3)', [r.id, r, r.ts])
    await client.query(`INSERT INTO app_meta(key, value) VALUES ('meta', $1) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [JSON.stringify(seed.meta)])
    await client.query(`INSERT INTO app_meta(key, value) VALUES ('seed_hash', $1) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [hash])
    await client.query('COMMIT')
    console.log(`[migrate] seeded ${seed.initiatives.length} initiatives · ${seed.spend_categories.length} categories · ${seed.opportunities.length} opportunities`)
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  migrate().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
