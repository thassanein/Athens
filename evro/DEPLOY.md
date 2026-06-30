# Deploying Athens EVRO + adding the database to PostgreSQL

EVRO is a single web service (Express) that serves the built SPA **and** `/api`
from one origin, backed by PostgreSQL. There are two ways the database gets into
Postgres — both are covered below.

---

## How the database is created & seeded

The schema and seed data live in two places, kept in sync from one source
(`data/seed.json`):

| Artifact | Purpose |
|---|---|
| `server/db/migrate.js` | Runs on **every server boot**: `CREATE TABLE IF NOT EXISTS …`, then seeds from `data/seed.json` when the DB is empty (or re-seeds when the seed's content hash changes). This is how Render provisions the DB automatically. |
| `server/db/schema.sql` | Standalone DDL (physical schema reference). |
| `server/db/seed.sql` | The **whole database as portable SQL** (DDL + `TRUNCATE` + `INSERT`s). Load into any PostgreSQL with one command, no Node required. |

Regenerate the SQL after editing the seed:
```bash
cd evro/server && npm run sql      # rewrites db/schema.sql + db/seed.sql from data/seed.json
```

---

## Option A — Render, sharing the existing `athens-db` (recommended, free)

Render's free tier allows only **one** free PostgreSQL, and the facilities app
already uses it (`athens-db`). EVRO therefore **shares that database**: all its
tables are prefixed `evro_` (so they can't collide with the facilities tables),
and `evro/render.yaml` does **not** provision a new database — it expects you to
point `DATABASE_URL` at `athens-db`.

1. **New → Blueprint** → connect this repo.
   - Branch: the branch that contains `evro/` (the default branch, once merged).
   - **Blueprint Path:** `evro/render.yaml` (Render supports a non-root blueprint;
     no need to move the file). Build runs `cd evro/...` from the repo root.
2. Render creates the **web service `athens-evro`** (no new database). The first
   build comes up healthy even without a database — `/api/health` returns 200
   (`db:false`) and the SPA serves in demo mode.
3. **Wire the shared DB:** Dashboard → **athens-db → Connections → Internal
   Database URL** (copy it) → **athens-evro → Environment → `DATABASE_URL`** →
   paste → **Save** (this redeploys).
4. On that boot, `migrate.js` creates the `evro_*` tables in `athens-db` and
   seeds them — logs `[migrate] seeded 40 initiatives · 116 categories · 10 opportunities`.
   The facilities tables are untouched.
5. App is live at the service URL; health `/api/health`, summary `/overview`.

> Sharing is safe: EVRO only ever touches `evro_*` tables (incl. its own
> `evro_meta`); the facilities app only touches `sites/permits/leases/.../app_meta`.
> Free web services cold-start (~30s) and free Postgres expires after ~30 days.

### Prefer a dedicated database instead?
Add a `databases:` block back to `evro/render.yaml` (name `evro-db`) and change
`DATABASE_URL` to `fromDatabase`, then set that database's `plan` to a **paid**
tier (free is limited to one). EVRO then runs fully isolated with no manual step.

---

## Option B — Add the database to an existing PostgreSQL (manual)

Load the entire EVRO database into any PostgreSQL with a single file:

```bash
createdb evro
psql -d evro -f evro/server/db/seed.sql     # schema + all seed data, idempotent
```

`seed.sql` is wrapped in a transaction and `TRUNCATE`s first, so it is safe to
re-run. Point the app at that database:

```bash
cd evro/frontend && npm install && npm run build
cd ../server && npm install
DATABASE_URL=postgres://USER:PASS@HOST:5432/evro PORT=4100 NODE_ENV=production npm start
# → http://localhost:4100/
```

On boot, `migrate.js` sees the matching seed hash and **does not re-seed** (logs
`schema ok; seed unchanged`), so your loaded data is preserved.

### Local Postgres in this sandbox (runs as the `postgres` user)
```bash
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | head -1)
mkdir -p /tmp/evropg && chown postgres:postgres /tmp/evropg
su postgres -c "$PGBIN/initdb -D /tmp/evropg -A trust"
su postgres -c "$PGBIN/pg_ctl -D /tmp/evropg -o '-p 5601 -k /tmp' -l /tmp/evropg.log start"
su postgres -c "$PGBIN/createdb -p 5601 -h /tmp evro"

# either let the server seed it…
cd evro/server && PGHOST=/tmp PGPORT=5601 PGUSER=postgres PGDATABASE=evro npm run migrate
# …or load the SQL directly:
PGHOST=/tmp PGPORT=5601 PGUSER=postgres PGDATABASE=evro psql -f db/seed.sql

# run the full stack (serves the built SPA + API)
cd ../frontend && npm install && npm run build
cd ../server && npm install
PGHOST=/tmp PGPORT=5601 PGUSER=postgres PGDATABASE=evro PORT=4100 NODE_ENV=production npm start
```

---

## Connecting to the database directly

The data is real, queryable PostgreSQL (JSONB payloads), e.g.:
```sql
SELECT data->>'pillar' AS pillar, count(*),
       sum((data->>'gross_annual_value')::numeric) AS gross
FROM evro_initiatives GROUP BY 1;
```

## Environment variables
| Var | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection string (preferred). |
| `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE` | Discrete vars (pg reads these if `DATABASE_URL` is unset). |
| `PORT` | HTTP port (default 4100). |
| `NODE_ENV=production` | Serve the built SPA from `../frontend/dist`. |
| `AUTO_RESEED=false` | Only seed an empty DB; never re-seed on a seed change. |
