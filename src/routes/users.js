'use strict';

const express = require('express');
const db = require('../db');
const { requireAdmin, hashPassword } = require('../auth');

const router = express.Router();

// Every route here requires an admin session.
router.use(requireAdmin);

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC'
    );
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// POST /api/users  { email, name, password, role }
router.post('/', async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const wantedRole = role === 'admin' ? 'admin' : 'member';
    const password_hash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, name || '', password_hash, wantedRole]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    return next(err);
  }
});

// PATCH /api/users/:id  { name?, role?, password? }
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, role, password } = req.body || {};
    const cols = [];
    const vals = [];
    if (typeof name === 'string') {
      cols.push(`name = $${cols.length + 1}`);
      vals.push(name);
    }
    if (role === 'admin' || role === 'member') {
      cols.push(`role = $${cols.length + 1}`);
      vals.push(role);
    }
    if (password) {
      cols.push(`password_hash = $${cols.length + 1}`);
      vals.push(await hashPassword(password));
    }
    if (cols.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided' });
    }
    vals.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE users SET ${cols.join(', ')} WHERE id = $${vals.length}
       RETURNING id, email, name, role, created_at`,
      vals
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
