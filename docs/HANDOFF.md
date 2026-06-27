# Handoff: Athens Facility Compliance — mobile app

## Overview
A mobile-first app for Athens Services field auditors to track **permits, leases and inspection
findings** across five facilities. Auditors open the app on a phone, see a portfolio map of all
sites, work a list of open findings, capture new findings with a photo on the yard, and drill into
a per-site compliance record (a scaled site plan + checklists + permits + an exportable audit packet).

This package contains a **working high-fidelity prototype** of the app plus a **runnable
PostgreSQL backend**. It is everything needed to deploy the app for real or to rebuild it in a
framework of your choice.

---

## About the design files
The files in `frontend/` are **functional design references built in HTML** — high-fidelity
prototypes that show the intended look, copy and behavior, and that actually run. They are *not*
meant to be shipped verbatim into a production stack. Two valid paths:

- **Path A — Productionize the prototype (fastest).** Host the existing web app as a PWA and run the
  provided `server/` (Node + Express + PostgreSQL) behind it. Most of the work is wiring writes to
  the API, real auth, and hosting. Recommended for an internal field tool.
- **Path B — Recreate in a framework.** Rebuild the screens in React/Vue/SwiftUI using this README
  as the spec and your team's component library. Use the same `server/` backend.

The HTML uses a tiny in-house runtime (`support.js`, "Design Components"). If you take Path B you do
**not** need that runtime — treat the `.dc.html` files as visual + behavioral references and read
the logic blocks for the data rules.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy and interactions. Recreate pixel-faithfully.

---

## Tech at a glance
- **Frontend:** single-page mobile web app, ~440px portrait. PWA-ready (`manifest.webmanifest`,
  `sw.js`, icons). Font is **Carlito** (a metric-compatible Calibri, Athens' approved Office face).
- **Backend:** `server/` — Express REST API over PostgreSQL. Schema enforces the two status models.
  See `server/README.md` for setup; endpoint table reproduced below.
- **Data contract:** `GET /api/sites` returns the whole portfolio as an object keyed by site name,
  shaped exactly like `data/sitedata.json`. The app reads that first and falls back to a bundled
  snapshot when the server is down (Profile → *Data source* shows which mode is live).

---

## Design tokens

### Color (Athens brand — fixed)
| Token | Hex | Use |
|---|---|---|
| Athens Red | `#D5172A` | Accent / "needs attention" ONLY — never a fill |
| Navy / Ink | `#1A2736` | Headers, primary text, screen headers |
| Green | `#1A5632` | Pass / active / compliant |
| Amber | `#B7791F` | Renewing / open action |
| Blue | `#1A428A` | Supporting (links, info) |
| Grey | `#939598` | Supporting / muted text |
| App background | `#EEF1F5` | Screen background |
| Card border | `#E6E9EE` | Card / row hairlines |

Status tints (card backgrounds): pass `#E6F0EA` · fail `#FBE7E9` · open/renew `#FBF3E2` · n-a `#EEF1F5`.

### Two status models (kept distinct — do not merge)
- **Permits & leases:** `active` (green) · `renew` (amber) · `verify` (red). Read-only RAG reference.
- **Checklist findings:** `pass` (green) · `fail` (red) · `open` (amber) · `na` (grey). Action-driving.

> **Dave's date rule (non-negotiable):** a permit's printed expiration date is NOT ground truth.
> "Renewing" = in the normal invoice/fee cycle (routine), not overdue. Only genuinely unconfirmed
> items go red ("verify"). Status is payment/cycle-driven, not date-driven.

### Type
- Family: `Carlito, Calibri, -apple-system, system-ui, sans-serif`.
- Screen title 21px/700 · section H2 17–18px/700 · body 13.5–14px/400–600 · labels 10.5px/700
  uppercase letter-spacing .6px · stat numbers 19–23px/700. Antialiased.

### Shape
Cards 13px radius · stat tiles 11px · pills/badges 20px · bottom sheet 20px top corners ·
FAB 50% (58px, 4px white ring) · card shadow `0 1px 3px rgba(15,28,46,.06)`.

---

## Screens / views

The app has a persistent **bottom tab bar** with a center **Capture FAB**:
`Map · Tasks · (Capture) · Alerts · Profile`. Active tab = Athens Red; inactive = Grey.

### 1. Login
- **Purpose:** authenticate the auditor.
- **Layout:** full-bleed navy gradient (`#243549→#1A2736→#141e2b`), centered logo + tagline, bottom CTA block.
- **Components:** 78px red rounded-square "A" logo; "Facility Compliance" 25/700; subtitle in `#9FB0C4`;
  white "Sign in with Microsoft" button (Microsoft 4-square glyph); "Continue as Dave Marin · demo" text link;
  footer "Athens Services · v0.4 POC" + data-source dot.
- **Behavior:** both buttons enter the app (Map). **Production:** replace with Microsoft Entra / Azure AD SSO.

### 2. Map (home / portfolio)
- **Purpose:** see all five sites at a glance and pick one.
- **Layout:** navy header (greeting + 3 stat tiles) → 264px regional map panel → "All sites" list.
- **Components:**
  - Stat tiles: Open findings (red number), To verify (amber), Due ≤30d (navy).
  - Map: stylized regional plan with one RAG **pin** per site (`{site} · {openCount}`); legend chip
    (At risk / Open / Clear). Pin color = red if ≥10 open or any verify, else amber, else green.
  - Site rows: left RAG border, name, `{type} · {city}`, open-count pill, "{n} to verify" note, chevron.
- **Behavior:** tap a pin or row → opens the **Site record** (screen 7) for that site.

### 3. Tasks (My Day)
- **Purpose:** work the cross-site list of open findings.
- **Components:** navy header with headline "{n} open findings" + a resolve **progress ring**
  ("{done} of {total} items cleared"); horizontal **filter chips** (All open / Failing / Unassigned /
  American Organics); finding cards (status left-border, dept chip Facility/ENV, due/needs-fix tag,
  title, "{site} · {owner|Unassigned}"). Empty state: "Nothing open here — all clear."
- **Behavior:** tap a card → Site record at that finding.

### 4. Capture (FAB → bottom sheet)
- **Purpose:** log a new finding from the field.
- **Components (bottom sheet, slides up):** Site select · Checklist segmented (ENV / Facility) ·
  Area select (Scale/Entrance, Admin, Processing, Compost/Working, Ponds/Stormwater, Maint. Shop,
  HazMat Storage, Fuel/CNG) · "What's wrong" textarea · Owner · Due (date) · "Add photo evidence"
  (camera capture on mobile) · "Log finding" primary button.
- **Behavior:** saves a new checklist item (`status:open`, `source:field`, map marker = area centroid),
  shows a "Finding logged" toast, and it appears in Tasks/Alerts/Record. **Production:** `POST /api/findings`.

### 5. Alerts (notifications)
- **Purpose:** surface what needs attention now.
- **Components:** rows for "{n} findings have no owner", each permit needing verification ("Verify" tag),
  and renewal-cycle permits within 90 days ("Renewing" tag). Icon chip + title + "{site} · {detail}" + tag.
- **Behavior:** tap → relevant site record. Tab shows a count badge.

### 6. Profile / settings
- **Components:** user card (avatar initials, name, role); "Add to Home Screen" button (PWA install);
  settings toggles (Push notifications, Offline sync, Open camera on capture); **Data source** row
  (live badge: "PostgreSQL (local)" green / "Local (demo)" amber); Sign out; version footer.

### 7. Site record (per-facility) — `Athens Compliance Record v3.dc.html`
The detailed screen the app drills into. (In the prototype it's a separate file the app navigates to;
in production fold it in as an in-app route.)
- **Map-led:** opens on a **scaled site plan** with permit pins (round, RAG) and finding pins, placed
  on real zones; tap a zone → its obligations + open findings. A `mapStyle` option offers three plan
  treatments (Plan / Blueprint / Terrain).
- **Renewal timeline:** a "next 90 days" ribbon (renewals read as routine, overdue zone separate).
- **Tabs:** Findings (worklist) · Permits (RAG cards + per-area rollup) · Leases · Facility Inspection ·
  ENV Compliance (the two checklists; Fail/Open cards expand to owner/due/note/photo with a completion ring).
- **Site packet:** print/export a PDF audit packet.
- **Anchor site:** American Organics (VVRCF), SWIS 36-AA-0346 — the richest, fully-verified site.

> **Scope guardrails (from the original brief, still binding):** Permits/leases are read-only RAG
> (no field entry). **Fleet/vehicle inspection is excluded** — it lives in Fleetio, not this tool.
> Two checklists only (Facility + ENV).

---

## Interactions & behavior
- **Navigation:** bottom-tab routing between Map/Tasks/Alerts/Profile; FAB opens the Capture sheet
  (transform-based slide-up). Site/finding taps route to the Site record.
- **Capture sheet:** modal over a dimmed backdrop; tap backdrop or ✕ to dismiss.
- **Toasts:** transient confirmation (1.9s).
- **Data-source detection:** on load the app calls `GET /api/sites` with a 700ms timeout; success →
  Postgres mode, failure → bundled snapshot + `localStorage`.
- **Avoid opacity-based mount animations** on re-rendering containers (a stranded `@keyframes from{opacity:0}`
  caused blank screens during development — use transform-based transitions or set a base opacity).

## State management
- `screen` — login | map | tasks | alerts | profile
- `data` — portfolio object keyed by site name (`{type, swis, addr, lat, lng, permits[], leases[], checklist[]}`)
- `capture` — draft finding (site, dept, area, note, owner, due, photo) or null
- `taskFilter` — all | fail | unassigned | ao
- `settings` — { push, offline, camera }
- `source` — postgres | local · `user` — { name, role, initials }
- Persistence: writes go to `localStorage` in the prototype; in production send to the API.

---

## Backend & API (see `server/README.md`)
PostgreSQL tables: `sites`, `permits`, `leases`, `checklist_items` (status CHECK-constrained per the
two models; `checklist_items.source` = seed | field).

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/sites` | whole portfolio, shaped like `data/sitedata.json` |
| PATCH | `/api/checklist/:id` | update a finding (status / owner / due / note / photo) |
| POST | `/api/findings` | create a field finding (Capture) |
| PATCH | `/api/permits/:id` | change a permit's RAG status |
| GET | `/api/health` | liveness + DB check |

Setup: `cd server && cp .env.example .env && createdb athens_compliance && npm install && npm run initdb && npm run seed && npm start`.

---

## Path to a production app (recommended order)
1. **Host the frontend** on a real URL; the PWA manifest + service worker give home-screen install + offline.
2. **Run `server/` for real** — managed PostgreSQL; move photo storage from base64 to blob storage (S3 / Azure Blob).
3. **Real auth** — Microsoft Entra / Azure AD SSO (org is already on Microsoft/SharePoint); per-auditor identity.
4. **Wire writes** — point `saveCapture()` and finding edits at the API endpoints (already implemented).
5. **Multi-user** — server becomes source of truth; drop the `localStorage` fallback to read-only offline cache.
6. **Optional native** — wrap the same web app with **Capacitor** for App Store / MDM distribution + native push/camera. No rewrite.

---

## Assets
- `frontend/icon-192.png`, `frontend/icon-512.png` — app icons (navy field, red "A" tile). Regenerate at brand quality for production.
- Font **Carlito** loaded from Google Fonts in the prototype; self-host for production.
- All other UI is inline SVG / CSS — no raster assets.

## Files in this bundle
- `frontend/Athens Compliance App.dc.html` — the app (login + 5 screens + capture).
- `frontend/Athens Compliance Record v3.dc.html` — the per-site record (screen 7).
- `frontend/Athens Compliance App (phone).html` — self-contained single-file build (open directly on a phone).
- `frontend/` also: `support.js` (runtime), `sitedata.js` / `sitedata-global.js` (bundled snapshot),
  `manifest.webmanifest`, `sw.js`, icons.
- `server/` — schema, seed, Express API, package.json, .env.example, README.
- `data/sitedata.json` — canonical seed (5 sites).
- `design-explorations/` — the three app-shell options explored before this build (context only).
