import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { pool } from './db.js';
import { migrate } from '../db/migrate.js';
import {
  authMode,
  authEnabled,
  sessionMiddleware,
  mountAuthRoutes,
  requireAuth,
  requireAuditor,
} from './auth.js';
import { portfolioDiagnostics, facilityDetail, renderOverviewHTML, renderFacilityHTML, renderLlmsTxt, expectedTemplate } from './diagnostics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1); // behind Render's proxy — needed for secure cookies

// Same-origin in the default (single-host) setup, so CORS is off. Set
// CORS_ORIGIN (e.g. a separate frontend URL) to allow a cross-origin frontend.
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(','), credentials: true }));
}
// Open/public mode: let any origin read & write the API (and /auth/me) so other
// apps and AI tools can consume it. No cookies are needed in this mode, so a
// wildcard origin is safe. Locking auth (Entra/passcodes) disables this.
if (!authEnabled) {
  app.use(['/api', '/auth', '/overview', '/llms.txt'], (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
}
app.use(express.json({ limit: '25mb' })); // photos (findings + audit items) arrive as base64 data URLs
app.use(sessionMiddleware);
mountAuthRoutes(app);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

function shapeChecklistRow(r) {
  return {
    id: r.id, site: r.site, dept: r.dept, area: r.area, title: r.title,
    status: r.status, owner: r.owner, due: fmtDate(r.due), note: r.note,
    photo: r.photo, source: r.source, lat: r.lat, lng: r.lng,
  };
}

function shapeAudit(r) {
  return {
    id: r.id, site: r.site, template: r.template, status: r.status,
    auditor: r.auditor,
    started: r.started instanceof Date ? r.started.toISOString() : r.started,
    updated: r.updated instanceof Date ? r.updated.toISOString() : r.updated,
    answered: r.answered != null ? Number(r.answered) : undefined,
    deficiencies: r.deficiencies != null ? Number(r.deficiencies) : undefined,
  };
}

function shapePermitRow(r) {
  return {
    id: r.id, site: r.site, name: r.name, agency: r.agency, number: r.number,
    status: r.status, expires: fmtDate(r.expires), cycle: r.cycle, area: r.area, doc: r.doc,
  };
}

// ---------------------------------------------------------------------------
// Routes — /api is protected (writes are auditor-only). /api/health is public.
// ---------------------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: true, auth: authMode });
  } catch (err) {
    res.status(503).json({ ok: true, db: false, error: err.message });
  }
});

// Build the full portfolio object (same shape the SPA consumes). Shared by
// SECURITY (temporary lockdown): do not expose links into the external document
// store (SharePoint) from the app. When false, every served surface — /api/sites,
// /api/facility, /api/portfolio, and the /overview HTML — is stripped of folder /
// siteMap / per-document url / per-permit doc URLs. Flip to true to restore.
const EXPOSE_DOC_LINKS = false;

// Strip every external document/permit URL from a loaded portfolio, in place.
// Document names are kept (they're not secret); only the links are removed.
function redactDocLinks(portfolio) {
  for (const site of Object.values(portfolio)) {
    site.folder = null;
    site.siteMap = null;
    site.documents = (site.documents || []).map((d) => ({ name: d.name }));
    for (const p of site.permits || []) p.doc = null;
  }
  return portfolio;
}

// /api/sites and the server-rendered diagnostics surfaces.
async function loadPortfolio() {
  const [sites, permits, leases, checklist] = await Promise.all([
    pool.query('SELECT * FROM sites ORDER BY name'),
    pool.query('SELECT * FROM permits ORDER BY id'),
    pool.query('SELECT * FROM leases ORDER BY id'),
    pool.query('SELECT * FROM checklist_items ORDER BY id'),
  ]);
  const out = {};
  for (const s of sites.rows) {
    out[s.name] = {
      type: s.type, swis: s.swis, addr: s.addr, city: s.city,
      lat: s.lat, lng: s.lng, anchor: s.anchor,
      folder: s.folder, siteMap: s.site_map, documents: s.documents ?? [], compliance: s.compliance ?? null,
      permits: [], leases: [], checklist: [],
    };
  }
  for (const p of permits.rows) {
    if (!out[p.site]) continue;
    out[p.site].permits.push({
      id: p.id, name: p.name, agency: p.agency, number: p.number,
      status: p.status, expires: fmtDate(p.expires), cycle: p.cycle, area: p.area, doc: p.doc,
    });
  }
  for (const l of leases.rows) {
    if (!out[l.site]) continue;
    out[l.site].leases.push({
      id: l.id, name: l.name, lessor: l.lessor, status: l.status,
      expires: fmtDate(l.expires), area: l.area,
    });
  }
  for (const c of checklist.rows) {
    if (!out[c.site]) continue;
    out[c.site].checklist.push(shapeChecklistRow(c));
  }
  if (!EXPOSE_DOC_LINKS) redactDocLinks(out);
  return out;
}

app.get('/api/sites', requireAuth, async (_req, res, next) => {
  try {
    res.json(await loadPortfolio());
  } catch (err) {
    next(err);
  }
});

// Machine-readable portfolio diagnostics (rollup + per-facility summary).
app.get('/api/portfolio', requireAuth, async (_req, res, next) => {
  try {
    res.json(portfolioDiagnostics(await loadPortfolio()));
  } catch (err) {
    next(err);
  }
});

// Machine-readable detail for a single facility.
app.get('/api/facility/:name', requireAuth, async (req, res, next) => {
  try {
    const data = await loadPortfolio();
    const name = req.params.name;
    const site = data[name];
    if (!site) return res.status(404).json({ error: `Unknown facility '${name}'.`, facilities: Object.keys(data) });
    res.json(facilityDetail(name, site));
  } catch (err) {
    next(err);
  }
});

// Index of public endpoints (API discovery for tools).
app.get('/api', (req, res) => {
  res.json({
    app: 'Athens Facility Compliance',
    description: 'Compliance command center for the Athens facilities portfolio.',
    authMode,
    endpoints: {
      health: '/api/health',
      sites: '/api/sites',
      portfolio: '/api/portfolio',
      audits: '/api/audits',
      overview: '/overview',
      llms: '/llms.txt',
    },
  });
});

app.patch('/api/checklist/:id', requireAuth, requireAuditor, async (req, res, next) => {
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
      return res.status(400).json({ error: 'No updatable fields provided (status, owner, due, note, photo).' });
    }
    if (
      Object.prototype.hasOwnProperty.call(req.body, 'status') &&
      !['pass', 'fail', 'open', 'na'].includes(req.body.status)
    ) {
      return res.status(400).json({ error: "status must be one of 'pass','fail','open','na'." });
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE checklist_items SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ error: `Checklist item '${id}' not found.` });
    res.json(shapeChecklistRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Capture — allowed for any authenticated user (viewers can log findings).
app.post('/api/findings', requireAuth, async (req, res, next) => {
  try {
    const { site, dept, area, title, note, owner, due, photo, lat, lng } = req.body || {};
    if (!site) return res.status(400).json({ error: 'site is required.' });
    if (!['Facility', 'ENV'].includes(dept)) return res.status(400).json({ error: "dept must be 'Facility' or 'ENV'." });
    const siteCheck = await pool.query('SELECT 1 FROM sites WHERE name = $1', [site]);
    if (siteCheck.rowCount === 0) return res.status(400).json({ error: `Unknown site '${site}'.` });

    const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const finalTitle = title ?? note ?? null;
    const result = await pool.query(
      `INSERT INTO checklist_items
         (id, site, dept, area, title, status, owner, due, note, photo, source, lat, lng)
       VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,'field',$10,$11) RETURNING *`,
      [id, site, dept, area ?? null, finalTitle, owner ?? null, due ?? null, note ?? null, photo ?? null, lat ?? null, lng ?? null]
    );
    res.status(201).json(shapeChecklistRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

app.patch('/api/permits/:id', requireAuth, requireAuditor, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['active', 'renew', 'verify'].includes(status)) {
      return res.status(400).json({ error: "status must be one of 'active','renew','verify'." });
    }
    const result = await pool.query('UPDATE permits SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: `Permit '${id}' not found.` });
    res.json(shapePermitRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Audits — saved checklist runs. Open to any authenticated user (field tool,
// like Capture). Responses are stored per item; site/template identify the run.
// ---------------------------------------------------------------------------
app.get('/api/audits', requireAuth, async (req, res, next) => {
  try {
    const { site, template, status } = req.query;
    const where = [];
    const vals = [];
    for (const [col, v] of [['site', site], ['template', template], ['status', status]]) {
      if (v) { vals.push(v); where.push(`a.${col} = $${vals.length}`); }
    }
    const sql = `
      SELECT a.*,
        COUNT(r.item) FILTER (WHERE r.val IS NOT NULL)        AS answered,
        COUNT(r.item) FILTER (WHERE r.val = 'no')             AS deficiencies
      FROM audits a LEFT JOIN audit_responses r ON r.audit = a.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      GROUP BY a.id
      ORDER BY a.updated DESC`;
    const { rows } = await pool.query(sql, vals);
    res.json(rows.map(shapeAudit));
  } catch (err) {
    next(err);
  }
});

// Audit hygiene across the whole portfolio: which audits use the wrong form for
// their facility type, and which are empty drafts. Helps clean up stray records.
// (Registered before /api/audits/:id so "review" isn't read as an id.)
app.get('/api/audits/review', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.site, a.template, a.status, a.auditor, a.updated, s.type,
        COUNT(r.item) FILTER (WHERE r.val IS NOT NULL) AS answered
      FROM audits a
      LEFT JOIN sites s ON s.name = a.site
      LEFT JOIN audit_responses r ON r.audit = a.id
      GROUP BY a.id, s.type
      ORDER BY a.updated DESC`);
    const audits = rows.map((r) => {
      const expected = expectedTemplate(r.type);
      const answered = Number(r.answered);
      return {
        id: r.id, site: r.site, type: r.type || null, template: r.template, status: r.status,
        auditor: r.auditor, updated: r.updated instanceof Date ? r.updated.toISOString() : r.updated,
        answered, expectedTemplate: expected,
        formMismatch: !!r.template && !!r.type && r.template !== expected,
        emptyDraft: answered === 0 && r.status !== 'complete',
      };
    });
    const mismatched = audits.filter((a) => a.formMismatch);
    const emptyDrafts = audits.filter((a) => a.emptyDraft);
    res.json({
      total: audits.length,
      mismatchedCount: mismatched.length,
      emptyDraftCount: emptyDrafts.length,
      mismatched,
      emptyDrafts,
      audits,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/audits/:id', requireAuth, async (req, res, next) => {
  try {
    const a = await pool.query('SELECT * FROM audits WHERE id = $1', [req.params.id]);
    if (a.rowCount === 0) return res.status(404).json({ error: 'Audit not found' });
    const r = await pool.query('SELECT item, val, note, photo FROM audit_responses WHERE audit = $1', [req.params.id]);
    const responses = {};
    for (const row of r.rows) responses[row.item] = { val: row.val, note: row.note || '', photo: row.photo || null };
    res.json({ ...shapeAudit(a.rows[0]), responses });
  } catch (err) {
    next(err);
  }
});

app.post('/api/audits', requireAuth, async (req, res, next) => {
  try {
    const { site, template } = req.body || {};
    if (!site) return res.status(400).json({ error: 'site is required.' });
    const siteCheck = await pool.query('SELECT 1 FROM sites WHERE name = $1', [site]);
    if (siteCheck.rowCount === 0) return res.status(400).json({ error: `Unknown site '${site}'.` });
    const id = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const auditor = req.user?.name || req.user?.email || 'Unknown';
    const result = await pool.query(
      `INSERT INTO audits (id, site, template, status, auditor) VALUES ($1,$2,$3,'in_progress',$4) RETURNING *`,
      [id, site, template ?? null, auditor]
    );
    res.status(201).json({ ...shapeAudit(result.rows[0]), responses: {} });
  } catch (err) {
    next(err);
  }
});

// Delete every audit whose form doesn't match its facility's type (the stray
// records created before Start-audit was locked to the matching form). Returns
// the list of deleted ids. Responses cascade.
async function deleteMismatchedAudits() {
  const { rows } = await pool.query(
    'SELECT a.id, a.template, s.type FROM audits a JOIN sites s ON s.name = a.site'
  );
  const bad = rows.filter((r) => r.template && r.template !== expectedTemplate(r.type)).map((r) => r.id);
  if (bad.length) await pool.query('DELETE FROM audits WHERE id = ANY($1)', [bad]);
  return bad;
}

// Manual trigger for the cleanup above.
app.post('/api/audits/cleanup', requireAuth, async (_req, res, next) => {
  try {
    const deleted = await deleteMismatchedAudits();
    res.json({ ok: true, deletedCount: deleted.length, deleted });
  } catch (err) {
    next(err);
  }
});

// Delete an audit (and its responses, via ON DELETE CASCADE).
app.delete('/api/audits/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM audits WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Audit not found' });
    res.json({ ok: true, deleted: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

// Save responses (full set) and/or status. Idempotent: replaces the audit's
// response rows with the supplied map.
app.patch('/api/audits/:id', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { responses, status } = req.body || {};
    if (status && !['in_progress', 'complete'].includes(status)) {
      return res.status(400).json({ error: "status must be 'in_progress' or 'complete'." });
    }
    await client.query('BEGIN');
    const exists = await client.query('SELECT 1 FROM audits WHERE id = $1', [id]);
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Audit not found' });
    }
    if (responses && typeof responses === 'object') {
      await client.query('DELETE FROM audit_responses WHERE audit = $1', [id]);
      for (const [item, r] of Object.entries(responses)) {
        if (!r || (!r.val && !r.note && !r.photo)) continue;
        if (r.val && !['yes', 'no', 'na'].includes(r.val)) continue;
        await client.query(
          'INSERT INTO audit_responses (audit, item, val, note, photo) VALUES ($1,$2,$3,$4,$5)',
          [id, item, r.val ?? null, r.note ?? null, r.photo ?? null]
        );
      }
    }
    const upd = await client.query(
      'UPDATE audits SET status = COALESCE($2, status), updated = now() WHERE id = $1 RETURNING *',
      [id, status ?? null]
    );
    await client.query('COMMIT');
    res.json(shapeAudit(upd.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// Server-rendered, no-JS surfaces for crawlers / AI diagnostics tools. These
// must be registered before the SPA catch-all so they aren't shadowed by it.
// ---------------------------------------------------------------------------
app.get('/overview', requireAuth, async (_req, res, next) => {
  try {
    res.type('html').send(renderOverviewHTML(await loadPortfolio(), { authMode }));
  } catch (err) {
    next(err);
  }
});

app.get('/overview/:name', requireAuth, async (req, res, next) => {
  try {
    const data = await loadPortfolio();
    const name = req.params.name;
    const site = data[name];
    if (!site) {
      return res
        .status(404)
        .type('html')
        .send(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;margin:40px"><h1>Facility not found</h1><p>'${name.replace(/[<>&]/g, '')}' is not in the portfolio. <a href="/overview">See all facilities</a>.</p></body>`);
    }
    res.type('html').send(renderFacilityHTML(name, site, { authMode }));
  } catch (err) {
    next(err);
  }
});

app.get('/llms.txt', requireAuth, async (req, res, next) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(renderLlmsTxt(await loadPortfolio(), { baseUrl }));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Serve the built frontend (single-host setup). API/auth routes already matched
// above; everything else falls back to the SPA's index.html.
// ---------------------------------------------------------------------------
if (PROD) {
  const dist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// Create tables / seed-if-empty, sweep out any wrong-form audits, then listen.
migrate()
  .catch((err) => console.error('[migrate] error (continuing):', err.message))
  .then(() => deleteMismatchedAudits())
  .then((deleted) => {
    if (deleted && deleted.length) console.log(`[cleanup] removed ${deleted.length} mismatched audit(s)`);
  })
  .catch((err) => console.error('[cleanup] error (continuing):', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(
        `Athens Compliance API on http://localhost:${PORT}  (auth: ${authMode})`
      );
    });
  });
