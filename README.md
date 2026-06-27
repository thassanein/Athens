# Athens Command Center

A lightweight goals / OKR command center for tracking **goals → key results → projects**,
the **drivers** (owners) responsible for them, and the **documents** attached to each project.
Built as a small Express + PostgreSQL app with a zero-build vanilla-JS dashboard.

> **Deploying it?** See **[DEPLOY.md](DEPLOY.md)** for step-by-step instructions
> (Neon + Vercel, or your own PostgreSQL).

## What it does

- **Login** with email + password (sessions stored in PostgreSQL, so it works on serverless hosts).
- **Dashboard** of goals, each expandable into its key results, each expandable into its projects.
- **Inline editing** — click a title, change a status, drag a progress number; it saves automatically.
- **Owners** — assign a driver to any goal, key result, or project.
- **Documents** — upload, download, and delete files per project (stored in the database).
- **Manage users** (admins only) — add teammates, set roles, remove accounts.

## Data model

| Table         | Purpose                                              |
|---------------|------------------------------------------------------|
| `users`       | Login accounts (`admin` / `member`)                  |
| `drivers`     | People who own work (goal / KR / project owners)     |
| `goals`       | Top-level strategic goals                            |
| `key_results` | Measurable key results under a goal                  |
| `projects`    | Initiatives that move a key result forward           |
| `documents`   | Files attached to a project (bytes stored in the DB) |
| `session`     | Login sessions (managed by `connect-pg-simple`)      |

See [`db/schema.sql`](db/schema.sql).

## Running locally

```bash
# 1. Configure
cp .env.example .env        # then fill in DATABASE_URL, SESSION_SECRET, SEED_ADMIN_*

# 2. Create tables + load starter data (seed also applies the schema)
npm install
npm run seed

# 3. Start
npm start                   # http://localhost:3000
```

`npm run seed` prints `✓ Seeded 5 drivers, 18 KRs, 25 projects, 5 goals` and creates
your first admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. It's safe to re-run —
it won't duplicate the admin or the starter data.

## API overview

All routes are under `/api` and (except auth) require a session cookie.

| Method   | Path                               | Notes                                  |
|----------|------------------------------------|----------------------------------------|
| `POST`   | `/api/auth/login` · `/logout`      | `{ email, password }`                  |
| `GET`    | `/api/auth/me`                     | current user                           |
| `GET/POST` | `/api/{goals,key-results,projects,drivers}` | list / create             |
| `PATCH/DELETE` | `/api/{resource}/:id`        | update (whitelisted fields) / delete   |
| `GET/POST` | `/api/projects/:id/documents`    | list metadata / upload (`file` field)  |
| `GET/DELETE` | `/api/documents/:id`           | download bytes / delete                |
| `GET/POST` | `/api/users` (admin)             | list / create users                    |
| `PATCH/DELETE` | `/api/users/:id` (admin)     | update role/name/password / delete     |

## Project layout

```
api/index.js        Vercel serverless entry (re-exports the Express app)
src/server.js       `npm start` entry (app.listen)
src/app.js          Express app: sessions, routes, static, errors
src/db.js           pg Pool (SSL aware via PGSSL)
src/auth.js         bcrypt + session auth helpers/middleware
src/routes/         auth, data (CRUD + documents), users (admin)
scripts/seed.js     schema apply + admin + starter OKR data
db/schema.sql       database schema (idempotent)
public/             vanilla-JS dashboard (index.html, app.js, styles.css)
```
