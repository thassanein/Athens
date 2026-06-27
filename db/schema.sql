-- Athens Command Center — database schema
-- Safe to run more than once: every object is created with IF NOT EXISTS.
--
-- Data model:
--   users        — people who can log in
--   drivers      — the people who own/drive the work (goal/KR/project owners)
--   goals        — top-level strategic goals
--   key_results  — measurable key results under a goal
--   projects     — initiatives that move a key result forward
--   documents    — files attached to a project (stored in the database)
--   session      — login sessions (managed by connect-pg-simple)

-- ---------------------------------------------------------------------------
-- Session store (connect-pg-simple)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    varchar      NOT NULL COLLATE "default",
  "sess"   json         NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS = FALSE);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
  ) THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- ---------------------------------------------------------------------------
-- Users (login accounts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Drivers (owners of goals / key results / projects)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Goals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  driver_id   INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'on_track'
              CHECK (status IN ('not_started', 'on_track', 'at_risk', 'off_track', 'on_hold', 'done')),
  progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  target_date DATE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Key results (KRs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS key_results (
  id            SERIAL PRIMARY KEY,
  goal_id       INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  driver_id     INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  unit          TEXT NOT NULL DEFAULT '',
  start_value   NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_value  NUMERIC NOT NULL DEFAULT 100,
  status        TEXT NOT NULL DEFAULT 'on_track'
                CHECK (status IN ('not_started', 'on_track', 'at_risk', 'off_track', 'on_hold', 'done')),
  progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_key_results_goal ON key_results (goal_id);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  key_result_id INTEGER REFERENCES key_results(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  driver_id   INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'on_track'
              CHECK (status IN ('not_started', 'on_track', 'at_risk', 'off_track', 'on_hold', 'done')),
  progress    INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  start_date  DATE,
  due_date    DATE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_key_result ON projects (key_result_id);

-- ---------------------------------------------------------------------------
-- Documents (attached to a project; file bytes live in the database so that
-- uploads work on serverless/ephemeral hosts like Vercel)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  content_type  TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes    INTEGER NOT NULL DEFAULT 0,
  data          BYTEA NOT NULL,
  uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON documents (project_id);
