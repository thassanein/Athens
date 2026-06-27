'use strict';

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  // Loaded lazily by callers that don't already require dotenv.
  try {
    require('dotenv').config();
  } catch (_) {
    /* dotenv is optional in production hosts that inject env vars directly */
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and fill it in (see DEPLOY.md).'
  );
}

// SSL handling:
//   PGSSL=disable        -> no SSL (plain internal server)
//   anything else / unset -> SSL on, but don't fail on self-signed managed certs.
let ssl;
if (process.env.PGSSL === 'disable') {
  ssl = false;
} else {
  ssl = { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: Number(process.env.PG_POOL_MAX || 10),
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected idle Postgres client error:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
