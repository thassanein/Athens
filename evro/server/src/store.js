// Reassemble the whole db object from the per-entity tables, and persist the
// mutable tables after a write. Tables are prefixed `evro_` (see migrate.js) so
// EVRO can share a PostgreSQL instance with another app without collision; the
// in-memory db object keeps the unprefixed logical keys the engine expects.
import { pool } from './db.js'
import { phys, META } from '../db/migrate.js'

export async function loadDb(exec = pool) {
  const q = (sql, p) => exec.query(sql, p)
  const meta = JSON.parse((await q(`SELECT value FROM ${META} WHERE key=$1`, ['meta'])).rows[0]?.value || '{}')
  const get = async (t, order = 'id') => (await q(`SELECT data FROM ${phys(t)} ORDER BY ${order}`)).rows.map((r) => r.data)
  return {
    meta,
    krs: await get('krs'),
    people: await get('people'),
    sourcing_groups: await get('sourcing_groups'),
    spend_categories: await get('spend_categories'),
    savings_pct_config: await get('savings_pct_config', 'group_id'),
    opportunities: await get('opportunities'),
    initiatives: await get('initiatives'),
    badges: await get('badges'),
    points_ledger: await get('points_ledger'),
    audit_log: (await q(`SELECT data FROM ${phys('audit_log')} ORDER BY ts DESC`)).rows.map((r) => r.data),
  }
}

// Replace the mutable tables from the post-mutation db (small data sets). The
// pair's first element is the logical name (= db object key AND, via phys(),
// the physical table name).
export async function persistMutable(client, db) {
  for (const [t, key] of [['initiatives', 'id'], ['opportunities', 'id'], ['savings_pct_config', 'group_id'], ['points_ledger', 'id']]) {
    await client.query(`DELETE FROM ${phys(t)}`)
    for (const r of db[t]) await client.query(`INSERT INTO ${phys(t)} (${key}, data) VALUES ($1, $2)`, [r[key], r])
  }
  await client.query(`DELETE FROM ${phys('audit_log')}`)
  for (const r of db.audit_log) await client.query(`INSERT INTO ${phys('audit_log')} (id, data, ts) VALUES ($1, $2, $3)`, [r.id, r, r.ts || new Date().toISOString()])
}
