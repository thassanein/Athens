# Athens Facility Compliance — Server

A Node + Express REST API over PostgreSQL for the Athens Facility Compliance app.
It serves the facility portfolio (sites, permits, leases, and inspection
checklists) and accepts field updates.

## Requirements

- Node.js >= 18
- PostgreSQL (local or via `DATABASE_URL`)

## Setup

```bash
cp .env.example .env          # then edit credentials if needed
createdb athens_compliance    # create the database
npm install
npm run initdb                # apply db/schema.sql (drops + recreates tables)
npm run seed                  # load data/sitedata.json into the DB
npm start                     # start the API (default http://localhost:4000)
```

For development with auto-reload:

```bash
npm run dev
```

## Configuration

Connection is read from the environment (see `.env.example`):

- Discrete variables: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- Or a single `DATABASE_URL` connection string (takes precedence if set)
- `PORT` — HTTP port for the API (default `4000`)

## Data notes

- **Dates** (`expires`, `due`) are returned as `YYYY-MM-DD` strings, or `null`.
- **Photos** are stored and returned as base64 data URLs (the JSON body limit is
  `10mb` to accommodate them).
- `GET /api/sites` returns the whole portfolio as an object keyed by site name,
  shaped exactly like `data/sitedata.json`.

## Endpoints

| Method | Path                   | Description                                                                                          | Body                                                                       | Returns                                  |
| ------ | ---------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| GET    | `/api/health`          | Liveness + DB check (`SELECT 1`). Returns `503` with `db:false` if the query fails.                  | —                                                                          | `{ ok, db }`                             |
| GET    | `/api/sites`           | Whole portfolio, keyed by site name, with nested `permits[]`, `leases[]`, `checklist[]`.             | —                                                                          | `{ "<site>": { ...site, permits, leases, checklist } }` |
| PATCH  | `/api/checklist/:id`   | Update a checklist finding. Any of `status`, `owner`, `due`, `note`, `photo`.                        | `{ status?, owner?, due?, note?, photo? }`                                 | The updated checklist row                |
| POST   | `/api/findings`        | Create a field finding (`status:'open'`, `source:'field'`, auto id). `site` must exist; `dept` in `Facility`/`ENV`. | `{ site, dept, area?, title? (or note), owner?, due?, photo?, lat?, lng? }` | The created checklist row (`201`)        |
| PATCH  | `/api/permits/:id`     | Change a permit's RAG status. `status` must be `active`/`renew`/`verify`.                            | `{ status }`                                                               | The updated permit row                   |

### Status / enum values

- Permit & lease `status`: `active`, `renew`, `verify`
- Checklist `status`: `pass`, `fail`, `open`, `na`
- Checklist `dept`: `Facility`, `ENV`
- Checklist `source`: `seed`, `field`

## Project layout

```
server/
  package.json
  .env.example
  README.md
  db/
    schema.sql      # table definitions (re-runnable)
    initdb.js       # applies schema.sql
    seed.js         # loads ../../data/sitedata.json
  src/
    db.js           # configured pg Pool
    index.js        # Express app + routes
```
