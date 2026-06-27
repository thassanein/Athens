import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function makeClient() {
  if (process.env.DATABASE_URL) {
    return new Client({ connectionString: process.env.DATABASE_URL });
  }
  return new Client(); // reads PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE from env
}

async function main() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = await readFile(schemaPath, 'utf8');

  const client = makeClient();
  await client.connect();
  try {
    await client.query(sql);
    console.log('Schema applied successfully from', schemaPath);
  } finally {
    await client.end();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('initdb failed:', err);
    process.exit(1);
  }
);
