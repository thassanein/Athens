import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/db/seed.js -> repo-root data/sitedata.json
const DATA_PATH = path.resolve(__dirname, '../../data/sitedata.json');

function makeClient() {
  if (process.env.DATABASE_URL) {
    return new Client({ connectionString: process.env.DATABASE_URL });
  }
  return new Client();
}

async function main() {
  const raw = await readFile(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  const client = makeClient();
  await client.connect();

  const counts = { sites: 0, permits: 0, leases: 0, checklist_items: 0 };

  try {
    await client.query('BEGIN');

    // Idempotent: wipe existing rows. CASCADE from sites covers children,
    // but be explicit for clarity / partial-table cases.
    await client.query('DELETE FROM checklist_items');
    await client.query('DELETE FROM permits');
    await client.query('DELETE FROM leases');
    await client.query('DELETE FROM sites');

    for (const [name, site] of Object.entries(data)) {
      await client.query(
        `INSERT INTO sites (name, type, swis, addr, city, lat, lng, anchor, folder, site_map, documents, compliance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          name,
          site.type ?? null,
          site.swis ?? null,
          site.addr ?? null,
          site.city ?? null,
          site.lat ?? null,
          site.lng ?? null,
          site.anchor ?? false,
          site.folder ?? null,
          site.siteMap ?? null,
          JSON.stringify(site.documents ?? []),
          site.compliance ? JSON.stringify(site.compliance) : null,
        ]
      );
      counts.sites++;

      for (const p of site.permits ?? []) {
        await client.query(
          `INSERT INTO permits (id, site, name, agency, number, status, expires, cycle, area, doc)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            p.id,
            name,
            p.name ?? null,
            p.agency ?? null,
            p.number ?? null,
            p.status ?? null,
            p.expires ?? null,
            p.cycle ?? null,
            p.area ?? null,
            p.doc ?? null,
          ]
        );
        counts.permits++;
      }

      for (const l of site.leases ?? []) {
        await client.query(
          `INSERT INTO leases (id, site, name, lessor, status, expires, area)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            l.id,
            name,
            l.name ?? null,
            l.lessor ?? null,
            l.status ?? null,
            l.expires ?? null,
            l.area ?? null,
          ]
        );
        counts.leases++;
      }

      for (const c of site.checklist ?? []) {
        await client.query(
          `INSERT INTO checklist_items
             (id, site, dept, area, title, status, owner, due, note, photo, source, lat, lng)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            c.id,
            name,
            c.dept ?? null,
            c.area ?? null,
            c.title ?? null,
            c.status ?? null,
            c.owner ?? null,
            c.due ?? null,
            c.note ?? null,
            c.photo ?? null,
            c.source ?? 'seed',
            c.lat ?? null,
            c.lng ?? null,
          ]
        );
        counts.checklist_items++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }

  console.log('Seed complete from', DATA_PATH);
  console.log(
    `Inserted: ${counts.sites} sites, ${counts.permits} permits, ` +
      `${counts.leases} leases, ${counts.checklist_items} checklist items`
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('seed failed:', err);
    process.exit(1);
  }
);
