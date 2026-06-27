import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Prefer a single DATABASE_URL connection string when provided,
// otherwise fall back to the discrete PG* environment variables
// (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE), which pg reads
// automatically.
export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool();

export default pool;
