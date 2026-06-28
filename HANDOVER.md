# Handover — Athens Facility Compliance

Mobile-first field-auditor app for tracking **permits, leases and inspection findings** across five
Athens facilities. This document is the practical "pick it up from here" guide: what exists, how to
run and deploy it, the decisions made, and the rough edges to know about.

> Product/design spec this build follows: [`docs/HANDOFF.md`](docs/HANDOFF.md).
> Top-level usage: [`README.md`](README.md).

---

## 1. Status at a glance

- **Frontend:** React + Vite mobile web app (PWA-ready). Built and working.
- **Backend:** Node + Express REST API over PostgreSQL. Built, schema + seed + endpoints verified
  end-to-end against a live PostgreSQL 16.
- **CI:** GitHub Actions — frontend build + backend smoke test on every PR (`.github/workflows/ci.yml`).
- **Hosting (demo):** GitHub Pages — no backend, bundled data, localStorage. Via `.github/workflows/deploy-pages.yml`.
- **Hosting (live, shared data):** Render blueprint (`render.yaml`) — always-on Express + managed
  PostgreSQL, single URL, **Microsoft Entra SSO**. Step-by-step in **[`DEPLOY.md`](DEPLOY.md)**.

**Live link:** **https://thassanein.github.io/Athens/**
(If it ever looks stale, append a cache-buster: `?v=4`, `?v=5`, …)

---

## 2. Repository layout

```
data/sitedata.json          Canonical seed — the whole portfolio (5 sites). Source of truth.
frontend/                   React + Vite app (login + 5 screens + capture + per-site record).
  src/App.jsx               Global state + routing + write handlers + roles.
  src/screens/              Login, MapScreen, Tasks, Alerts, Profile, SiteRecord.
  src/components/           TabBar, Capture (bottom sheet), Toast, Icons (inline SVG).
  src/lib/api.js            Data-source detection (API w/ 700ms timeout → snapshot fallback) + writes.
  src/lib/derive.js         Portfolio math + status helpers (the two status models live here).
  src/lib/sitedata.js       AUTO-GENERATED offline snapshot (npm run gen:snapshot).
  src/index.css             Design tokens (Athens brand) + all component styles.
  public/                   manifest.webmanifest, sw.js (service worker), icon-192/512.png.
  scripts/gen-snapshot.mjs  Regenerates the bundled snapshot from data/sitedata.json.
  scripts/gen-icons.mjs     Regenerates the app icons (pure-Node PNG encoder).
server/                     Express API over PostgreSQL (schema, seed, endpoints). See server/README.md.
.github/workflows/ci.yml            CI: frontend build + backend smoke test.
.github/workflows/deploy-pages.yml  Build frontend + publish to GitHub Pages.
docs/HANDOFF.md             Original product/design handoff (the spec).
```

---

## 3. Run it locally

### Demo mode (frontend only, no database) — fastest
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```
Open the URL, tap **"Continue as … demo"**. Data source shows **Local (demo)** — edits persist to
`localStorage`.

### Full stack (live PostgreSQL)
```bash
cd server
cp .env.example .env          # set PGPASSWORD etc. as needed
createdb athens_compliance
npm install
npm run initdb && npm run seed
npm start                     # API on :4000
```
Then `npm run dev` in `frontend/` (the dev server proxies `/api` → `:4000`). Profile → Data source
flips to **PostgreSQL (local) · Live**.

---

## 4. Roles (two logins)

Implemented as two demo logins on the sign-in screen (Microsoft button maps to Auditor):

| Role | Can do |
|---|---|
| **Auditor** (Dave Marin) | Edit findings on **both** checklists (Facility + ENV) and the Findings worklist — comment, photo evidence, owner, due date, status. Capture new findings. |
| **Viewer** (Sam Okafor) | Read-only on existing findings (comment/photo visible, no edit controls). **Can still capture** new findings. |

- Role is held in `App.jsx` (`USERS`, `user`, `canEdit = user.role === 'auditor'`) and threaded to
  `SiteRecord` → `FindingCard` / `ChecklistTab`.
- Switch roles by **Sign out** (Profile) → pick the other login.
- Production: replace demo logins with **Microsoft Entra / Azure AD SSO**; carry the role claim from
  the IdP instead of the demo picker.

---

## 5. Data model & API

`GET /api/sites` returns the whole portfolio keyed by site name, shaped exactly like
`data/sitedata.json`. Dates are `YYYY-MM-DD` strings; photos are base64 data URLs.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/sites` | whole portfolio |
| PATCH | `/api/checklist/:id` | update a finding (status / owner / due / note / photo) |
| POST | `/api/findings` | create a field finding (Capture) — forces `status:open`, `source:field` |
| PATCH | `/api/permits/:id` | change a permit's RAG status |
| GET | `/api/health` | liveness + DB check |

**Two status models (kept distinct):**
- Permits & leases: `active` (green) · `renew` (amber) · `verify` (red). Read-only RAG.
- Checklist findings: `pass` · `fail` · `open` · `na`. Action-driving.

**Scope guardrails (from the brief):** permits/leases are read-only (no field entry); fleet/vehicle
inspection is excluded (lives in Fleetio); two checklists only (Facility + ENV).

---

## 6. Deployment (GitHub Pages) — read before you redeploy

The frontend (demo mode) auto-builds and publishes to GitHub Pages. **There are two quirks worth
knowing**, both discovered and worked around this session:

1. **Pages must be enabled once, by hand.** A workflow token can't self-enable Pages. It's already
   enabled (Settings → Pages → Source: **GitHub Actions**). If Pages ever gets reset, re-enable it
   there or the deploy's "Configure Pages" step fails with *"Resource not accessible by integration."*

2. **The `github-pages` environment only allows deploys from the repo's DEFAULT branch**, and the
   default branch is currently **`claude/new-session-x35f9w`** (not `main`). So:
   - The `push` trigger on `deploy-pages.yml` is set to `main`, but a push to `main` will be
     **rejected** by the environment gate (deploy job fails in ~1s with no steps).
   - To publish, **dispatch the workflow on the default branch**:
     Actions → "Deploy to GitHub Pages" → Run workflow → branch `claude/new-session-x35f9w`.
   - **Recommended cleanup:** set **`main`** as the repo default branch (Settings → Branches). Then
     normal push-to-`main` deploys work and this whole quirk goes away.

**Subpath:** the app is served under `/Athens/`. Vite `base` comes from `VITE_BASE` (set by the
deploy workflow from the Pages base path); manifest/icon/service-worker paths are relative so it
works at any base. Local dev/root hosting (`base: '/'`) is unchanged.

---

## 7. Caching / service worker

The service worker (`frontend/public/sw.js`) is **network-first**: always loads the latest when
online, falls back to cache only offline, and wipes old caches on activate (cache name bumped to
`v2`). `main.jsx` reloads once when a new SW takes control, so updates apply automatically.

> History: the first SW was cache-first and trapped users on a stale shell after each deploy. If you
> change caching again, prefer network-first (or stale-while-revalidate for assets) for an app that
> deploys often. A `?v=N` query param is a reliable manual cache-bust.

---

## 8. Keeping things in sync

- **Snapshot:** after editing `data/sitedata.json`, run `npm run gen:snapshot` (in `frontend/`) and
  commit the regenerated `src/lib/sitedata.js`. CI's frontend job fails if they drift.
- **Branch flow:** development happens on `claude/new-session-x35f9w` (also the repo default). PRs
  merge to `main`; CI runs on every PR.

---

## 9. Live shared-data deploy (Render + Entra SSO)

Implemented — see **[`DEPLOY.md`](DEPLOY.md)** for the click-by-click guide. In short:

- `render.yaml` provisions a managed PostgreSQL + a web service that builds the frontend and runs
  the Express server (which serves the SPA **and** `/api` from one origin).
- **Auth (`server/src/auth.js`), three modes, cookie sessions:**
  - **passcode** — shared `AUDITOR_PASSCODE` / `VIEWER_PASSCODE` (no admin needed; the default for
    the live deploy). Entering a passcode signs you in with that role.
  - **sso** — Microsoft Entra (Azure AD), OIDC auth-code + PKCE. Role from token app roles, else the
    `AUDITOR_EMAILS` allowlist, else `DEFAULT_ROLE`. Takes precedence over passcodes when configured.
  - **open** — local dev only (no auth env → dev user). In production with no auth the API is locked
    (503) so the DB can't leak.
  - `/api` writes are auditor-only (server-enforced, not just hidden in the UI).
- **Modes:** the same code runs "open" locally (no Entra env → dev user) and "secure" in production
  (Entra required; in prod it refuses to run without auth → returns 503, so the DB is never exposed).
- **Schema:** `server/db/migrate.js` runs on boot — creates tables if missing, seeds only if empty
  (never wipes live data).
- The frontend auto-detects mode via `/auth/me`: authed → app; 401 → Microsoft login; no server →
  demo (Pages).

## 10. Known limitations / next steps

- **Photos:** stored as base64 in DB rows. Move to blob storage (S3 / Azure Blob) for heavier use.
- **Permits/leases** are intentionally read-only (tap expands a detail panel only).
- **Default branch** is a `claude/...` branch — see §6; setting `main` as default is the clean fix
  (also update `branch:` in `render.yaml` if you do).
- **Free tiers** sleep (web) / expire (DB ~30 days) — upgrade for production (see DEPLOY.md).
- **Optional native:** wrap the same web app with Capacitor for App Store / MDM distribution.

---

## 11. Useful commands

```bash
# Frontend
cd frontend
npm run dev              # local dev server (proxies /api → :4000)
npm run build            # production build → dist/
npm run gen:snapshot     # regenerate the offline snapshot from data/sitedata.json
npm run gen:icons        # regenerate app icons

# Backend
cd server
npm run initdb && npm run seed && npm start

# Deploy the live site (until main is the default branch):
#   GitHub → Actions → "Deploy to GitHub Pages" → Run workflow → branch claude/new-session-x35f9w
```
