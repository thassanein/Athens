-- Athens Facility Compliance — schema
-- Re-runnable: drop everything first.

DROP TABLE IF EXISTS audit_responses CASCADE;
DROP TABLE IF EXISTS audits CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS permits CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS sites CASCADE;

CREATE TABLE sites (
  name   TEXT PRIMARY KEY,
  type   TEXT,
  swis   TEXT,
  addr   TEXT,
  city   TEXT,
  lat    DOUBLE PRECISION,
  lng    DOUBLE PRECISION,
  anchor BOOLEAN DEFAULT false,
  folder    TEXT,
  site_map  TEXT,
  documents JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE permits (
  id      TEXT PRIMARY KEY,
  site    TEXT REFERENCES sites(name) ON DELETE CASCADE,
  name    TEXT,
  agency  TEXT,
  number  TEXT,
  status  TEXT CHECK (status IN ('active','renew','verify')),
  expires DATE,
  cycle   TEXT,
  area    TEXT,
  doc     TEXT
);

CREATE TABLE leases (
  id      TEXT PRIMARY KEY,
  site    TEXT REFERENCES sites(name) ON DELETE CASCADE,
  name    TEXT,
  lessor  TEXT,
  status  TEXT CHECK (status IN ('active','renew','verify')),
  expires DATE,
  area    TEXT
);

CREATE TABLE checklist_items (
  id     TEXT PRIMARY KEY,
  site   TEXT REFERENCES sites(name) ON DELETE CASCADE,
  dept   TEXT CHECK (dept IN ('Facility','ENV')),
  area   TEXT,
  title  TEXT,
  status TEXT CHECK (status IN ('pass','fail','open','na')),
  owner  TEXT,
  due    DATE,
  note   TEXT,
  photo  TEXT,
  source TEXT CHECK (source IN ('seed','field')) DEFAULT 'seed',
  lat    DOUBLE PRECISION,
  lng    DOUBLE PRECISION
);

-- Audits: a saved checklist run for a site. site is plain TEXT (no FK) so a
-- portfolio re-seed never cascades away audit history.
CREATE TABLE audits (
  id       TEXT PRIMARY KEY,
  site     TEXT,
  template TEXT,
  status   TEXT CHECK (status IN ('in_progress','complete')) DEFAULT 'in_progress',
  auditor  TEXT,
  started  TIMESTAMPTZ DEFAULT now(),
  updated  TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE audit_responses (
  audit TEXT REFERENCES audits(id) ON DELETE CASCADE,
  item  TEXT NOT NULL,
  val   TEXT CHECK (val IN ('yes','no','na')),
  note  TEXT,
  PRIMARY KEY (audit, item)
);

CREATE INDEX idx_audits_site ON audits(site);
CREATE INDEX idx_checklist_items_site ON checklist_items(site);
CREATE INDEX idx_permits_site ON permits(site);
CREATE INDEX idx_leases_site ON leases(site);
