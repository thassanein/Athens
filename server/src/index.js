import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { pool } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // photos arrive as base64 data URLs

const PORT = Number(process.env.PORT) || 4000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Format a DATE column as a 'YYYY-MM-DD' string. pg returns DATE columns as
// JS Date objects (set to midnight in the local TZ). We pull the date parts in
// UTC to avoid off-by-one drift. null stays null.
function fmtDate(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Already a string (e.g. '2026-07-15' or an ISO timestamp) — keep date part.
  return String(value).slice(0, 10);
}

function shapeChecklistRow(r) {
  return {
    id: r.id,
    site: r.site,
    dept: r.dept,
    area: r.area,
    title: r.title,
    status: r.status,
    owner: r.owner,
    due: fmtDate(r.due),
    note: r.note,
    photo: r.photo,
    source: r.source,
    lat: r.lat,
    lng: r.lng,
  };
}

function shapePermitRow(r) {
  return {
    id: r.id,
    site: r.site,
    name: r.name,
    agency: r.agency,
    number: r.number,
    status: r.status,
    expires: fmtDate(r.expires),
    cycle: r.cycle,
    area: r.area,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health — reports whether the DB responds to SELECT 1.
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: true });
  } catch (err) {
    res.status(503).json({ ok: true, db: false, error: err.message });
  }
});

// Whole portfolio, keyed by site name, shaped exactly like data/sitedata.json.
app.get('/api/sites', async (_req, res, next) => {
  try {
    const [sites, permits, leases, checklist] = await Promise.all([
      pool.query('SELECT * FROM sites ORDER BY name'),
      pool.query('SELECT * FROM permits ORDER BY id'),
      pool.query('SELECT * FROM leases ORDER BY id'),
      pool.query('SELECT * FROM checklist_items ORDER BY id'),
    ]);

    const out = {};
    for (const s of sites.rows) {
      out[s.name] = {
        type: s.type,
        swis: s.swis,
        addr: s.addr,
        city: s.city,
        lat: s.lat,
        lng: s.lng,
        anchor: s.anchor,
        permits: [],
        leases: [],
        checklist: [],
      };
    }

    for (const p of permits.rows) {
      if (!out[p.site]) continue;
      out[p.site].permits.push({
        id: p.id,
        name: p.name,
        agency: p.agency,
        number: p.number,
        status: p.status,
        expires: fmtDate(p.expires),
        cycle: p.cycle,
        area: p.area,
      });
    }

    for (const l of leases.rows) {
      if (!out[l.site]) continue;
      out[l.site].leases.push({
        id: l.id,
        name: l.name,
        lessor: l.lessor,
        status: l.status,
        expires: fmtDate(l.expires),
        area: l.area,
      });
    }

    for (const c of checklist.rows) {
      if (!out[c.site]) continue;
      out[c.site].checklist.push({
        id: c.id,
        dept: c.dept,
        area: c.area,
        title: c.title,
        status: c.status,
        owner: c.owner,
        due: fmtDate(c.due),
        note: c.note,
        photo: c.photo,
        source: c.source,
        lat: c.lat,
        lng: c.lng,
      });
    }

    res.json(out);
  } catch (err) {
    next(err);
  }
});

// Update a checklist finding (status / owner / due / note / photo).
app.patch('/api/checklist/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ['status', 'owner', 'due', 'note', 'photo'];
    const sets = [];
    const values = [];

    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        values.push(req.body[field]);
        sets.push(`${field} = $${values.length}`);
      }
    }

    if (sets.length === 0) {
      return res
        .status(400)
        .json({ error: 'No updatable fields provided (status, owner, due, note, photo).' });
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, 'status') &&
      !['pass', 'fail', 'open', 'na'].includes(req.body.status)
    ) {
      return res
        .status(400)
        .json({ error: "status must be one of 'pass','fail','open','na'." });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE checklist_items SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Checklist item '${id}' not found.` });
    }

    res.json(shapeChecklistRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Create a field finding.
app.post('/api/findings', async (req, res, next) => {
  try {
    const { site, dept, area, title, note, owner, due, photo, lat, lng } = req.body || {};

    if (!site) {
      return res.status(400).json({ error: 'site is required.' });
    }
    if (!['Facility', 'ENV'].includes(dept)) {
      return res.status(400).json({ error: "dept must be 'Facility' or 'ENV'." });
    }

    const siteCheck = await pool.query('SELECT 1 FROM sites WHERE name = $1', [site]);
    if (siteCheck.rowCount === 0) {
      return res.status(400).json({ error: `Unknown site '${site}'.` });
    }

    const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const finalTitle = title ?? note ?? null;

    const result = await pool.query(
      `INSERT INTO checklist_items
         (id, site, dept, area, title, status, owner, due, note, photo, source, lat, lng)
       VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,'field',$10,$11)
       RETURNING *`,
      [
        id,
        site,
        dept,
        area ?? null,
        finalTitle,
        owner ?? null,
        due ?? null,
        note ?? null,
        photo ?? null,
        lat ?? null,
        lng ?? null,
      ]
    );

    res.status(201).json(shapeChecklistRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Change a permit's RAG status.
app.patch('/api/permits/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['active', 'renew', 'verify'].includes(status)) {
      return res
        .status(400)
        .json({ error: "status must be one of 'active','renew','verify'." });
    }

    const result = await pool.query(
      'UPDATE permits SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Permit '${id}' not found.` });
    }

    res.json(shapePermitRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// 404 + error handler
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`Athens Compliance API listening on http://localhost:${PORT}`);
});
