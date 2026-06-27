'use strict';

/**
 * Seeds the Athens Command Center database.
 *
 *  - Applies db/schema.sql first (idempotent), so this is safe to run on a
 *    fresh database.
 *  - Creates/ensures the first admin account from SEED_ADMIN_EMAIL /
 *    SEED_ADMIN_PASSWORD (won't duplicate an existing email).
 *  - Loads starter OKR data the first time only (skipped if goals already exist).
 *
 * Run with:  npm run seed
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');
const { DRIVERS, GOALS, KEY_RESULTS, PROJECTS } = require('./seed-data');

async function applySchema(client) {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await client.query(sql);
}

async function ensureAdmin(client) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('• Skipping admin: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one.');
    return;
  }
  const existing = await client.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  if (existing.rows.length > 0) {
    console.log(`• Admin ${email} already exists — leaving it unchanged.`);
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await client.query(
    `INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
    [email, 'Administrator', hash]
  );
  console.log(`✓ Created admin ${email}`);
}

async function seedOkrData(client) {
  const existing = await client.query('SELECT count(*)::int AS n FROM goals');
  if (existing.rows[0].n > 0) {
    console.log('• OKR data already present — skipping starter data.');
    return;
  }

  const driverIds = [];
  for (const d of DRIVERS) {
    const { rows } = await client.query(
      'INSERT INTO drivers (name, title, email) VALUES ($1, $2, $3) RETURNING id',
      [d.name, d.title, d.email]
    );
    driverIds.push(rows[0].id);
  }

  const goalIds = [];
  for (let i = 0; i < GOALS.length; i++) {
    const g = GOALS[i];
    const { rows } = await client.query(
      `INSERT INTO goals (title, description, driver_id, status, progress, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [g.title, g.description, driverIds[g.driver], g.status, g.progress, i]
    );
    goalIds.push(rows[0].id);
  }

  const krIds = [];
  for (let i = 0; i < KEY_RESULTS.length; i++) {
    const k = KEY_RESULTS[i];
    const { rows } = await client.query(
      `INSERT INTO key_results
         (goal_id, title, driver_id, unit, start_value, current_value, target_value, status, progress, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [goalIds[k.goal], k.title, driverIds[GOALS[k.goal].driver], k.unit, k.start, k.current, k.target, k.status, k.progress, i]
    );
    krIds.push(rows[0].id);
  }

  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i];
    const goalIdx = KEY_RESULTS[p.kr].goal;
    await client.query(
      `INSERT INTO projects
         (key_result_id, title, description, driver_id, status, progress, start_date, due_date, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [krIds[p.kr], p.title, p.description, driverIds[GOALS[goalIdx].driver], p.status, p.progress, p.start, p.due, i]
    );
  }

  console.log(`✓ Seeded ${DRIVERS.length} drivers, ${KEY_RESULTS.length} KRs, ${PROJECTS.length} projects, ${GOALS.length} goals`);
}

async function main() {
  const client = await pool.connect();
  try {
    await applySchema(client);
    await client.query('BEGIN');
    await ensureAdmin(client);
    await seedOkrData(client);
    await client.query('COMMIT');
    console.log('Done.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
