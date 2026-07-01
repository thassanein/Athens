# CLAUDE.md — Athens Facility Compliance (orientation for an AI assistant)

This is the up-to-date "what's going on" reference. If anything here conflicts with
`HANDOVER.md` / `docs/HANDOFF.md`, **this file wins** — those predate the recent work
(open access, command center, diagnostics surfaces, audit hygiene).

---

## 1. What this is

A mobile-first **compliance command center** for the Athens Services waste/recycling
portfolio (**33 facilities**). It tracks permits, leases, inspection findings, audits,
compliance gaps, due dates, owners, and audit readiness.

- **Frontend:** React 18 + Vite SPA (PWA, mobile-first, ~440px frame).
- **Backend:** Node + Express over PostgreSQL. Single-host: Express serves the built
  SPA **and** `/api` from one origin.
- **Deploy:** Render (`render.yaml`) — web service + managed Postgres. Auto-deploys
  from branch `claude/new-session-x35f9w`.

**Live app:** https://athens-compliance.onrender.com (free tier → ~30–60s cold start).

---

## 2. Access model (IMPORTANT — LOCKED DOWN via passcode)

The app is **locked to the team via shared passcodes** — it is no longer public.
The frontend shows a **passcode prompt** (not the old open Auditor/Viewer chooser),
and the API rejects anyone without a valid session.

- **Passcode sign-in:** entering `AUDITOR_PASSCODE` → full edit; `VIEWER_PASSCODE` →
  read-only. The **role is decided server-side** by which passcode was entered (not a
  client choice). Session is an httpOnly cookie (8h). Login UI: `Login.jsx` (passcode
  form when `mode==='passcode'`; the two-button chooser only shows in open mode).
- **Server auth modes** (`server/src/auth.js`): `open` (no auth env → public),
  `passcode` (`AUDITOR_PASSCODE`/`VIEWER_PASSCODE`) ← **current**, `sso` (Microsoft
  Entra). Setting either passcode flips it out of open mode. `requireAuth` returns 401
  without a session; `requireAuditor` returns 403 for viewers on writes.
- **CORS:** the wildcard `Access-Control-Allow-Origin: *` is sent **only in open mode**,
  so in the locked (passcode) state cross-origin apps / AI tools are blocked. The app
  itself is same-origin, so it's unaffected.
- ⚠️ **To keep it locked**, `AUDITOR_PASSCODE` and `VIEWER_PASSCODE` must be set in the
  Render dashboard (the blueprint declares them `sync: false`, so the *values* live only
  in Render, not the repo). Deleting both reopens the app publicly.
- **Doc links** to the SharePoint document store are also stripped everywhere (see the
  security lockdown: `EXPOSE_DOC_LINKS` in `server/src/index.js` + `frontend/src/lib/api.js`,
  and the strip in `frontend/scripts/gen-snapshot.mjs`).

---

## 3. Machine-readable surfaces (for tools / AI diagnostics)

An SPA only ships an empty shell to non-JS fetchers, so these server-rendered / JSON
surfaces exist (all public + CORS in open mode). Source: `server/src/diagnostics.js`.

| URL | What |
|---|---|
| `/overview` | Server-rendered HTML overview (KPIs + all facilities table). Facility names link to detail pages. Readable with JS disabled. |
| `/overview/<name>` | Server-rendered HTML detail for one facility (permits, leases, findings, docs). URL-encode the name. |
| `/api/portfolio` | JSON diagnostics: rollup (totals, status tiers, overdue, upcoming, high-risk) + per-facility summary. |
| `/api/facility/<name>` | JSON detail for one facility (404 + valid-name list if unknown). |
| `/api/sites` | Full JSON portfolio (permits, leases, findings, compliance, documents). |
| `/api/audits/review` | Portfolio audit hygiene: form-mismatched audits + empty drafts. |
| `/api/health` | Service + DB status. |
| `/api` | Endpoint discovery index. |
| `/llms.txt` | Plain-text guide for AI tools. |
| `index.html` | Has `<meta description>`, OG tags, and a `<noscript>` linking to the above. |

---

## 4. Repo layout (key files)

```
data/sitedata.json                 Canonical seed — the 33-site portfolio. SOURCE OF TRUTH.
frontend/
  src/App.jsx                      Global state, routing, write handlers, boot/auth flow.
  src/screens/
    Login.jsx                      Two-button Auditor/Viewer chooser (no credentials).
    MapScreen.jsx                  COMMAND CENTER home: exec KPIs, risk tiers, filters/sort,
                                   facility cards, portfolio export. (tab labelled "Home")
    SiteRecord.jsx                 Per-site overlay: tabs (findings, compliance, permits, docs,
                                   audits, report, leases, facility, env) + FacilityMap +
                                   renewal timeline + audit results/history.
    FacilityMap.jsx                Animated, data-driven facility plan (zones = real cert/permit
                                   areas, coloured by permit status). Per-type layouts.
    AuditRunner.jsx                Full-screen step-by-step audit; opens ONLY the matching form.
    Tasks/Alerts/Profile.jsx       Secondary screens.
  src/lib/
    api.js                         fetchMe() auth detection + API client (incl. deleteAudit).
    derive.js                      Portfolio math + status: riskTier, nextDue, portfolioRollup.
    audit-templates.js            AUTO-GENERATED 6 audit templates + TYPE_TEMPLATE mapping.
    demo-audits.js                 Deterministic demo audit per site (for no-backend mode).
    employees.js                   Demo roster + ownerFor() (deterministic compliance owner).
    portfolio-report.js            Printable portfolio summary (Export button).
    sitedata.js                    AUTO-GENERATED snapshot (npm run gen:snapshot). CI fails on drift.
server/
  src/index.js                     Express app: /api routes, diagnostics routes, SPA serving,
                                   startup migrate + mismatched-audit cleanup.
  src/auth.js                      Auth modes (open/passcode/sso), sessions, requireAuth/Auditor.
  src/diagnostics.js               Risk tiering + JSON/HTML/llms renderers (mirrors frontend).
  db/migrate.js                    Tables + content-hash-gated reseed (never wipes live silently).
  db/seed.js, schema.sql           Mirror migrate.
.github/workflows/ci.yml           Frontend build + snapshot drift + backend smoke tests.
render.yaml                        Render blueprint (open mode by default).
```

---

## 5. Run & test locally

**Frontend only (demo, no DB):**
```bash
cd frontend && npm install && npm run dev    # http://localhost:5173
```
No backend → demo mode: bundled snapshot, localStorage, the two-button login.

**Full stack** — local Postgres in this sandbox runs as the `postgres` user (won't run as
root). Pattern used during development:
```bash
# Postgres: data dir /tmp/athenspg, socket /tmp, port 5599
su postgres -c "/usr/lib/postgresql/*/bin/pg_ctl -D /tmp/athenspg -o '-p 5599 -k /tmp' -l /tmp/athenspg.log start"
# Server (PROD serves the built SPA at :4000 with same-origin /api):
cd frontend && npm run build
cd ../server && PGHOST=/tmp PGPORT=5599 PGUSER=postgres PGDATABASE=athens_test PORT=4000 NODE_ENV=production node src/index.js
# Open http://localhost:4000/  → live (postgres) mode end-to-end.
```
Gotchas: `npm run dev` must be run from `frontend/` (server dir has its own dev script).
Stale `node src/index.js` on :4000 causes EADDRINUSE — kill by PID/port first.

**Screenshots (Playwright, chromium pre-installed):**
```js
import pkg from '/opt/node22/lib/node_modules/playwright/node_modules/playwright-core/index.js'
const { chromium } = pkg
// executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
```

---

## 6. Data model & status

`GET /api/sites` returns the portfolio keyed by site name, shaped like `data/sitedata.json`.
Dates are `YYYY-MM-DD`; photos are base64 data URLs.

- **Site:** `type, swis, addr, city, lat, lng, anchor, folder, siteMap, documents[],`
  `compliance{present, missing, note, categories[{key,status}]}, permits[], leases[], checklist[]`.
- **Permit/lease status (RAG):** `active` (green) · `renew` (amber) · `verify` (red).
  Permit `area` is a **regulatory area** (CUPA, SWFP, SPCC, Stormwater, WDR, Air…), not a zone.
- **Finding status:** `pass · fail · open · na`.
- **Risk tier** (`derive.riskTier`, mirrored in `server/diagnostics.js`):
  - **Non-compliant** = a missing compliance item, a failing finding, or an overdue open action.
  - **At risk** = a permit to verify, open work, a renewal, or an expiry within 90 days.
  - **Compliant** = none of the above.
  Current portfolio: ~1 compliant / 8 at risk / 24 non-compliant.

**Facility type → audit form** (`TYPE_TEMPLATE`): MRF→mrf, Hauling Yard/Operations Yard→
hauling, Transfer Station→ts, Landfill→landfill, Compost/Organics→organics, Office/Other→
facility. Landfill is its own category (not a transfer station).

---

## 7. Full API

| Method | Route | Notes |
|---|---|---|
| GET | `/api/sites` | whole portfolio |
| GET | `/api/portfolio`, `/api/facility/:name` | diagnostics (see §3) |
| PATCH | `/api/checklist/:id` | update a finding — auditor only |
| POST | `/api/findings` | create a field finding (Capture) — any user |
| PATCH | `/api/permits/:id` | change a permit's RAG status — auditor only |
| GET | `/api/audits` | list (filters: `site`, `template`, `status`) |
| GET | `/api/audits/review` | wrong-form + empty-draft audits portfolio-wide |
| GET/POST/PATCH/DELETE | `/api/audits/:id` …, `/api/audits` | get/create/save/delete an audit |
| POST | `/api/audits/cleanup` | delete all wrong-form audits; returns deleted ids |
| GET | `/api/health` | liveness + DB |

Audit responses are stored per item (`audit_responses`, `ON DELETE CASCADE`). Deleting a
site cascades to its permits/leases/checklist/audits.

---

## 8. Audits & the "wrong form" fix (recent)

- Audits are per-site step-by-step checklists; 6 templates (`audit-templates.js`).
- **Start audit now opens only the form matching the facility type** (it used to let you
  pick any template — that's how an "MRF Master Form" ended up on LA North, an Operations
  Yard). LA North's `type` is and always was "Operations Yard" — the data was never wrong;
  the stray was an *audit record*.
- **Cleanup:** the server **deletes wrong-form audits on startup** (after migrate) and via
  `POST /api/audits/cleanup`. The Audits tab flags mismatches ("Wrong form for <type>") and
  has per-audit **Delete** (auditor). Empty-but-correct drafts are intentionally NOT
  auto-deleted (a real auditor may finish one later).

---

## 9. Conventions / gotchas

- **Snapshot:** after editing `data/sitedata.json`, run `npm run gen:snapshot` (in
  `frontend/`) and commit `src/lib/sitedata.js`. CI fails on drift.
- **Branch:** develop on `claude/new-session-x35f9w` (also the deploy branch). Don't push
  elsewhere without permission.
- **Egress:** this sandbox is **blocked from reaching `onrender.com`** (403) — you cannot
  read/modify the live DB from here. To act on live data, change server behavior (e.g. the
  startup cleanup) and let the redeploy run it, or give the user a `curl` to run.
- **`audit-templates.js` and `sitedata.js` are generated** — don't hand-edit.
- **Known live state:** wrong-form audits are cleaned (`/api/audits/review` →
  `mismatchedCount: 0`). A few empty test drafts ("Field Auditor", 0 answered) may remain;
  delete via the UI or extend the cleanup if asked.

---

## 10. Where things stand / possible next steps

- Shipped: command center home, risk tiers, filters/sort, portfolio export, animated
  facility map, per-site reports + audit results, demo audits, open access + 2-login,
  diagnostics surfaces (overview/portfolio/facility/llms), audit hygiene + auto-cleanup.
- Deferred / blocked: SharePoint folder writes + Outlook calendar (M365 connection is
  read-only — needs a write-enabled app registration); audit trail (who-changed-what)
  and expanded RBAC (admin/owner/leader/exec) need backend work; true `.xlsx` export
  (currently print/PDF).
