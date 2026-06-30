import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

// Prefer DATABASE_URL; otherwise fall back to the discrete PG* env vars that
// pg reads automatically (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE).
export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : new Pool()

export default pool
