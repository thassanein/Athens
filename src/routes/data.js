'use strict';

const express = require('express');
const multer = require('multer');
const db = require('../db');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per file
});

// Whitelisted, editable columns per resource. Anything not listed is ignored
// on create/update so the API can't be used to set arbitrary columns.
const RESOURCES = {
  drivers: {
    table: 'drivers',
    columns: ['name', 'title', 'email'],
    orderBy: 'name ASC',
  },
  goals: {
    table: 'goals',
    columns: ['title', 'description', 'driver_id', 'status', 'progress', 'target_date', 'sort_order'],
    orderBy: 'sort_order ASC, id ASC',
  },
  'key-results': {
    table: 'key_results',
    columns: [
      'goal_id', 'title', 'description', 'driver_id', 'unit',
      'start_value', 'current_value', 'target_value', 'status', 'progress', 'sort_order',
    ],
    orderBy: 'sort_order ASC, id ASC',
  },
  projects: {
    table: 'projects',
    columns: [
      'key_result_id', 'title', 'description', 'driver_id',
      'status', 'progress', 'start_date', 'due_date', 'sort_order',
    ],
    orderBy: 'sort_order ASC, id ASC',
  },
};

function getResource(req, res) {
  const resource = RESOURCES[req.params.resource];
  if (!resource) {
    res.status(404).json({ error: 'Unknown resource' });
    return null;
  }
  return resource;
}

// Build the column/value lists for an INSERT or UPDATE from a request body,
// keeping only whitelisted columns and turning '' into NULL for *_id/*_date.
function pickFields(resource, body) {
  const cols = [];
  const vals = [];
  for (const col of resource.columns) {
    if (!Object.prototype.hasOwnProperty.call(body, col)) continue;
    let value = body[col];
    if (value === '' && (col.endsWith('_id') || col.endsWith('_date'))) {
      value = null;
    }
    cols.push(col);
    vals.push(value);
  }
  return { cols, vals };
}

// ---- Documents -------------------------------------------------------------
// Registered before the generic /:resource routes so paths like
// /documents/:id are not swallowed by the generic handlers.

// GET /api/projects/:id/documents  -> metadata only (no bytes)
router.get('/projects/:id/documents', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, project_id, filename, content_type, size_bytes, uploaded_by, created_at
         FROM documents WHERE project_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// POST /api/projects/:id/documents  (multipart, field name "file")
router.post('/projects/:id/documents', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { rows } = await db.query(
      `INSERT INTO documents (project_id, filename, content_type, size_bytes, data, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, project_id, filename, content_type, size_bytes, uploaded_by, created_at`,
      [
        req.params.id,
        req.file.originalname,
        req.file.mimetype || 'application/octet-stream',
        req.file.size,
        req.file.buffer,
        req.session.userId,
      ]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// GET /api/documents/:id  -> downloads the file bytes
router.get('/documents/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT filename, content_type, data FROM documents WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const doc = rows[0];
    res.setHeader('Content-Type', doc.content_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${doc.filename.replace(/"/g, '')}"`
    );
    return res.send(doc.data);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/documents/:id
router.delete('/documents/:id', async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

// ---- Generic list / create / update / delete for the four resources --------

// GET /api/:resource
router.get('/:resource', async (req, res, next) => {
  const resource = getResource(req, res);
  if (!resource) return undefined;
  try {
    const { rows } = await db.query(
      `SELECT * FROM ${resource.table} ORDER BY ${resource.orderBy}`
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// POST /api/:resource
router.post('/:resource', async (req, res, next) => {
  const resource = getResource(req, res);
  if (!resource) return undefined;
  try {
    const { cols, vals } = pickFields(resource, req.body || {});
    if (cols.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const { rows } = await db.query(
      `INSERT INTO ${resource.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      vals
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/:resource/:id
router.patch('/:resource/:id', async (req, res, next) => {
  const resource = getResource(req, res);
  if (!resource) return undefined;
  try {
    const { cols, vals } = pickFields(resource, req.body || {});
    if (cols.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }
    const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE ${resource.table} SET ${setClause} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/:resource/:id
router.delete('/:resource/:id', async (req, res, next) => {
  const resource = getResource(req, res);
  if (!resource) return undefined;
  try {
    const { rowCount } = await db.query(
      `DELETE FROM ${resource.table} WHERE id = $1`,
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
