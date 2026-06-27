'use strict';

const path = require('path');
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);

const { pool } = require('./db');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const userRoutes = require('./routes/users');
const { requireAuth } = require('./auth');

function createApp() {
  const app = express();

  // Behind Vercel / proxies so secure cookies work.
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (!process.env.SESSION_SECRET) {
    // eslint-disable-next-line no-console
    console.warn('WARNING: SESSION_SECRET is not set — using an insecure default. Set it in your environment.');
  }

  app.use(
    session({
      store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || 'insecure-dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      },
    })
  );

  // Health check (handy for hosts / uptime probes).
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Public auth routes (login / logout / who am I).
  app.use('/api/auth', authRoutes);

  // Everything else under /api requires a session.
  app.use('/api/users', userRoutes); // admin checks happen inside
  app.use('/api', requireAuth, dataRoutes);

  // Static frontend.
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // SPA-ish fallback: serve the app shell for non-API GET routes.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(publicDir, 'index.html'));
  });

  // JSON error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  });

  return app;
}

module.exports = createApp;
