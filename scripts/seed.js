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

const DRIVERS = [
  { name: 'Tamer Hassanien', title: 'Chief Executive Officer', email: 'tamer@athensservices.com' },
  { name: 'Maria Gonzalez', title: 'VP, Operations', email: 'maria@athensservices.com' },
  { name: 'David Chen', title: 'Director, Fleet & Logistics', email: 'david@athensservices.com' },
  { name: 'Priya Patel', title: 'Director, Sustainability', email: 'priya@athensservices.com' },
  { name: 'James Okafor', title: 'Director, Customer Experience', email: 'james@athensservices.com' },
];

// driver = index into DRIVERS
const GOALS = [
  { title: 'Lead the region in diversion & sustainability', driver: 3, status: 'on_track', progress: 62,
    description: 'Be the recognized leader in landfill diversion and SB 1383 compliance across our service area.' },
  { title: 'Run the safest, most reliable fleet in the industry', driver: 2, status: 'at_risk', progress: 58,
    description: 'Zero preventable incidents, high uptime, and a cleaner fuel mix across the collection fleet.' },
  { title: 'Deliver an effortless customer experience', driver: 4, status: 'on_track', progress: 67,
    description: 'Make it easy for residents and businesses to get great service and self-serve online.' },
  { title: 'Grow revenue & operational efficiency', driver: 1, status: 'on_track', progress: 55,
    description: 'Profitable growth in commercial accounts while lowering cost per ton collected.' },
  { title: 'Build a high-performing, engaged team', driver: 0, status: 'at_risk', progress: 60,
    description: 'Attract, develop, and retain the drivers and staff who make Athens run.' },
];

// goal = index into GOALS
const KEY_RESULTS = [
  // Goal 0 — sustainability
  { goal: 0, title: 'Increase landfill diversion rate to 75%', unit: '%', start: 58, current: 64, target: 75, progress: 35, status: 'on_track' },
  { goal: 0, title: 'Roll out organics (SB 1383) collection to 100% of residential routes', unit: '%', start: 40, current: 72, target: 100, progress: 53, status: 'on_track' },
  { goal: 0, title: 'Cut recycling load contamination below 10%', unit: '%', start: 22, current: 15, target: 10, progress: 58, status: 'at_risk' },
  { goal: 0, title: 'Process 50,000 tons of recovered material at the MRF', unit: 'tons', start: 0, current: 31000, target: 50000, progress: 62, status: 'on_track' },
  // Goal 1 — fleet
  { goal: 1, title: 'Reduce preventable safety incidents below 5 per quarter', unit: 'incidents', start: 12, current: 7, target: 5, progress: 71, status: 'at_risk' },
  { goal: 1, title: 'Achieve 95% on-time route completion', unit: '%', start: 86, current: 91, target: 95, progress: 56, status: 'on_track' },
  { goal: 1, title: 'Convert 40% of the collection fleet to CNG/electric', unit: '%', start: 18, current: 27, target: 40, progress: 41, status: 'on_track' },
  { goal: 1, title: 'Keep fleet uptime above 92%', unit: '%', start: 84, current: 89, target: 92, progress: 62, status: 'at_risk' },
  // Goal 2 — customer
  { goal: 2, title: 'Raise customer satisfaction (CSAT) to 90%', unit: '%', start: 78, current: 84, target: 90, progress: 50, status: 'on_track' },
  { goal: 2, title: 'Resolve 90% of service requests within 24 hours', unit: '%', start: 65, current: 80, target: 90, progress: 60, status: 'on_track' },
  { goal: 2, title: 'Move 60% of customers to online self-service billing', unit: '%', start: 30, current: 45, target: 60, progress: 50, status: 'on_track' },
  { goal: 2, title: 'Reduce missed-pickup complaints by 50%', unit: 'complaints', start: 320, current: 210, target: 160, progress: 69, status: 'on_track' },
  // Goal 3 — growth
  { goal: 3, title: 'Grow commercial accounts to 4,500', unit: 'accounts', start: 3800, current: 4100, target: 4500, progress: 43, status: 'on_track' },
  { goal: 3, title: 'Improve EBITDA margin to 22%', unit: '%', start: 16, current: 19, target: 22, progress: 50, status: 'at_risk' },
  { goal: 3, title: 'Reduce cost per ton collected by 8%', unit: '% reduction', start: 0, current: 4, target: 8, progress: 50, status: 'on_track' },
  // Goal 4 — team
  { goal: 4, title: 'Raise employee engagement score to 80', unit: 'score', start: 68, current: 74, target: 80, progress: 50, status: 'on_track' },
  { goal: 4, title: 'Cut voluntary turnover below 12%', unit: '%', start: 19, current: 15, target: 12, progress: 57, status: 'at_risk' },
  { goal: 4, title: 'Fill 100% of CDL driver vacancies', unit: '%', start: 70, current: 88, target: 100, progress: 60, status: 'on_track' },
];

// kr = index into KEY_RESULTS
const PROJECTS = [
  { kr: 1, title: 'Curbside organics cart rollout — Phase 2', status: 'on_track', progress: 70, start: '2026-01-15', due: '2026-09-30', description: 'Distribute green carts and update routes for remaining residential zones.' },
  { kr: 3, title: 'MRF optical sorter upgrade', status: 'on_track', progress: 55, start: '2026-02-01', due: '2026-08-15', description: 'Install AI-assisted optical sorters to lift recovery throughput.' },
  { kr: 2, title: 'Recycling contamination education campaign', status: 'at_risk', progress: 45, start: '2026-01-10', due: '2026-07-31', description: 'Mailers, cart tagging, and outreach to reduce "wish-cycling".' },
  { kr: 1, title: 'Commercial food-waste collection program', status: 'on_track', progress: 60, start: '2026-03-01', due: '2026-10-15', description: 'Onboard restaurants and grocers to SB 1383 organics service.' },
  { kr: 4, title: 'Route safety telematics deployment', status: 'on_track', progress: 65, start: '2026-01-05', due: '2026-06-30', description: 'In-cab cameras and telematics across the collection fleet.' },
  { kr: 4, title: 'Defensive driver training refresh', status: 'on_track', progress: 80, start: '2026-02-10', due: '2026-05-31', description: 'Refreshed curriculum and ride-along coaching for all CDL drivers.' },
  { kr: 6, title: 'CNG fueling station buildout', status: 'at_risk', progress: 40, start: '2026-01-20', due: '2026-11-30', description: 'Build on-site CNG fueling to support fleet conversion.' },
  { kr: 6, title: 'Electric refuse truck pilot', status: 'on_track', progress: 35, start: '2026-04-01', due: '2026-12-15', description: 'Pilot 4 EV trucks on dense residential routes.' },
  { kr: 7, title: 'Preventive maintenance scheduling overhaul', status: 'on_track', progress: 58, start: '2026-02-01', due: '2026-07-31', description: 'Move from reactive repairs to scheduled preventive maintenance.' },
  { kr: 5, title: 'Dynamic route optimization software', status: 'on_track', progress: 62, start: '2026-01-15', due: '2026-08-31', description: 'Optimize daily routes to improve on-time completion.' },
  { kr: 8, title: 'CSAT survey & closed-loop feedback', status: 'on_track', progress: 72, start: '2026-01-08', due: '2026-06-30', description: 'Post-service surveys with follow-up on detractor feedback.' },
  { kr: 9, title: '24-hour service SLA workflow', status: 'on_track', progress: 68, start: '2026-02-15', due: '2026-07-15', description: 'Dispatch and CRM workflow to hit the 24-hour resolution target.' },
  { kr: 10, title: 'Customer self-service portal v2', status: 'on_track', progress: 50, start: '2026-03-01', due: '2026-10-31', description: 'Online account management, scheduling, and bulk pickup requests.' },
  { kr: 10, title: 'Paperless billing migration', status: 'on_track', progress: 55, start: '2026-01-20', due: '2026-09-15', description: 'Incentivize and migrate customers to e-billing.' },
  { kr: 11, title: 'Missed-pickup root-cause program', status: 'on_track', progress: 64, start: '2026-02-01', due: '2026-08-31', description: 'Track and eliminate the top causes of missed pickups.' },
  { kr: 12, title: 'Commercial sales expansion — South Bay', status: 'on_track', progress: 48, start: '2026-01-10', due: '2026-12-31', description: 'Targeted outreach to win commercial accounts in growth corridors.' },
  { kr: 13, title: 'Pricing & contract optimization', status: 'at_risk', progress: 42, start: '2026-02-01', due: '2026-10-31', description: 'Review and modernize pricing across commercial contracts.' },
  { kr: 14, title: 'Fuel & maintenance cost reduction initiative', status: 'on_track', progress: 52, start: '2026-01-15', due: '2026-11-30', description: 'Cut cost per ton through fuel, routing, and maintenance savings.' },
  { kr: 14, title: 'Automated cart-tipper retrofit', status: 'on_track', progress: 38, start: '2026-03-15', due: '2026-12-15', description: 'Retrofit trucks with automated tippers to lower labor and injury cost.' },
  { kr: 15, title: 'Employee engagement action plan', status: 'on_track', progress: 55, start: '2026-01-05', due: '2026-09-30', description: 'Department-level action plans from the engagement survey.' },
  { kr: 15, title: 'Frontline manager leadership program', status: 'on_track', progress: 60, start: '2026-02-01', due: '2026-08-31', description: 'Develop supervisors with a structured leadership curriculum.' },
  { kr: 16, title: 'Driver retention & referral bonus', status: 'at_risk', progress: 45, start: '2026-01-15', due: '2026-12-31', description: 'Retention bonuses and a driver referral program.' },
  { kr: 17, title: 'CDL apprenticeship & hiring pipeline', status: 'on_track', progress: 66, start: '2026-01-10', due: '2026-10-31', description: 'Apprenticeship program to grow our own CDL drivers.' },
  { kr: 4, title: 'Safety incentive & near-miss reporting', status: 'on_track', progress: 70, start: '2026-02-01', due: '2026-07-31', description: 'Reward near-miss reporting to surface hazards early.' },
  { kr: 7, title: 'Real-time fleet dashboard', status: 'on_track', progress: 50, start: '2026-03-01', due: '2026-09-30', description: 'Live visibility into uptime, location, and maintenance status.' },
];

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
