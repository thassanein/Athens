'use strict';

const bcrypt = require('bcryptjs');
const db = require('./db');

const SALT_ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function findUserByEmail(email) {
  const { rows } = await db.query(
    'SELECT id, email, name, password_hash, role FROM users WHERE lower(email) = lower($1)',
    [email]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await db.query(
    'SELECT id, email, name, role FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

// Express middleware: require a logged-in user.
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// Express middleware: require an admin user.
async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await findUserById(req.session.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.user = user;
  return next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  findUserByEmail,
  findUserById,
  requireAuth,
  requireAdmin,
};
