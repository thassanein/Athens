# Athens Facility Compliance

A mobile-first app for Athens Services field auditors to track **permits, leases and inspection
findings** across five facilities. Auditors open the app on a phone, see a portfolio map of all
sites, work a list of open findings, capture new findings with a photo on the yard, and drill into
a per-site compliance record (a scaled site plan + checklists + permits + an exportable audit packet).

This repository is a production-oriented build of that app: a **React** frontend (PWA-ready) over a
runnable **Express + PostgreSQL** backend, seeded from a canonical portfolio dataset.

> Built from the handoff spec in `docs/HANDOFF.md` (Path B — "recreate in a framework"). The
> backend is the same `server/` contract described in that handoff.

---

## Repository layout

```
data/sitedata.json     Canonical seed — the whole portfolio (5 sites). Source of truth.
server/                Express REST API over PostgreSQL (schema + seed + endpoints).
frontend/              React + Vite mobile web app (login + 5 screens + capture + site record).
docs/HANDOFF.md        Original product/design handoff (the spec this build follows).
```

The frontend reads `GET /api/sites` first and **falls back to a bundled snapshot** of
`data/sitedata.json` when the server is unreachable (Profile → *Data source* shows which mode is
live). The snapshot is generated from the canonical data with `npm run gen:snapshot`.

---

## Quick start

### 1. Backend (Express + PostgreSQL)

```bash
cd server
cp .env.example .env          # adjust PG* credentials if needed
createdb athens_compliance
npm install
npm run initdb                # apply schema.sql
npm run seed                  # load data/sitedata.json
npm start                     # API on http://localhost:4000
```

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api → :4000)
```

Open the dev URL on a phone-sized viewport. With the API running you'll see **PostgreSQL (local)**
as the data source; stop the API and reload to see the **Local (demo)** snapshot fallback.

Build for production with `npm run build` (output in `frontend/dist/`). Host `dist/` behind any
static server and point `/api` at the Express app.

---

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/sites` | whole portfolio, shaped like `data/sitedata.json` |
| PATCH | `/api/checklist/:id` | update a finding (status / owner / due / note / photo) |
| POST | `/api/findings` | create a field finding (Capture) |
| PATCH | `/api/permits/:id` | change a permit's RAG status |
| GET | `/api/health` | liveness + DB check |

Dates are returned as `YYYY-MM-DD` strings; photos are base64 data URLs. See `server/README.md`
for details and the table schema (CHECK-constrained per the two status models below).

---

## Screens

Persistent bottom tab bar with a center **Capture FAB**: `Map · Tasks · (Capture) · Alerts · Profile`.

1. **Login** — navy gradient, "Sign in with Microsoft" (placeholder for Entra/Azure AD SSO) + demo entry.
2. **Map** — portfolio stats, a regional map with one RAG pin per site, and the all-sites list.
3. **Tasks (My Day)** — cross-site open-findings worklist with a resolve progress ring + filter chips.
4. **Capture** — FAB → bottom sheet to log a field finding (site / checklist / area / note / owner / due / photo).
5. **Alerts** — unowned findings, permits to verify, and renewal-cycle permits within 90 days.
6. **Profile** — user card, PWA install, settings toggles, and the live **Data source** badge.
7. **Site record** — per-facility: a scaled site plan (Plan / Blueprint / Terrain) with permit & finding
   pins, a "next 90 days" renewal ribbon, and tabs for Findings · Permits · Leases · Facility · ENV.

---

## Two status models (kept distinct)

- **Permits & leases:** `active` (green) · `renew` (amber) · `verify` (red). Read-only RAG reference.
- **Checklist findings:** `pass` (green) · `fail` (red) · `open` (amber) · `na` (grey). Action-driving.

> **Dave's date rule:** a permit's printed expiration date is not ground truth. "Renewing" = in the
> normal invoice/fee cycle (routine), not overdue. Only genuinely unconfirmed items go red ("verify").

## Scope guardrails (from the brief)

Permits/leases are read-only RAG (no field entry). **Fleet/vehicle inspection is excluded** — it
lives in Fleetio. Two checklists only (Facility + ENV).

---

## Brand

Athens Red `#D5172A` (accent / needs-attention only — never a fill) · Navy `#1A2736` · Green
`#1A5632` · Amber `#B7791F` · Blue `#1A428A`. Font is **Carlito** (metric-compatible Calibri). All
tokens live in `frontend/src/index.css`.

## Notes for production

- Replace demo login with **Microsoft Entra / Azure AD SSO**.
- Move photo storage from base64 to blob storage (S3 / Azure Blob).
- The server becomes source of truth; the `localStorage` snapshot becomes a read-only offline cache.
- Optional: wrap the same web app with **Capacitor** for App Store / MDM distribution — no rewrite.
