# Deploy — live shared data (Render)

This turns the app into a **real multi-user system**: one always-on server with a managed
PostgreSQL database, served at a single URL, behind a login. Everyone who signs in sees and edits
the **same** data.

**Architecture:** one Render web service runs the Express server, which serves the built React app
**and** the `/api`. Same origin → no CORS, and login cookies just work. Data lives in Render's
managed PostgreSQL.

There are two login options. **Start with passcodes (no admin needed); add Microsoft SSO later.**

| Option | Setup | Best when |
|---|---|---|
| **A. Team passcodes** | Just two passcodes you choose | You want it live today, no IT involvement |
| **B. Microsoft Entra SSO** | Needs an Azure AD admin | You want per-person org sign-in (see Appendix) |

---

## Part 1 — Deploy on Render (with passcode login)

1. Go to **https://dashboard.render.com** → sign up / log in (GitHub login is easiest).
2. **New → Blueprint** → connect your GitHub → pick **`thassanein/Athens`**. Render reads
   `render.yaml` and shows one **web service** (`athens-compliance`) + one **PostgreSQL**
   (`athens-db`).
3. Render prompts for the env vars marked "sync:false". For passcode login, fill in just:
   - **`AUDITOR_PASSCODE`** — a strong passcode for people who can **edit** (e.g. `Athens-Audit-7741!`)
   - **`VIEWER_PASSCODE`** — a different passcode for **read-only** people (e.g. `Athens-View-2208`)
   - Leave all the `ENTRA_*` boxes **blank** (that's Option B).
   - `DATABASE_URL` and `SESSION_SECRET` are wired automatically — leave them.
4. Click **Apply**. Render provisions the database, runs the build (frontend → server), and starts
   it. First deploy takes a few minutes.
5. When it's live, note your URL at the top of the service page, e.g.
   `https://athens-compliance.onrender.com`.

The database schema is created and seeded automatically on first boot (non-destructive — later
deploys never wipe existing data).

---

## Part 2 — Verify

1. Open your Render URL → you'll see a **passcode** prompt.
2. Enter the **auditor** passcode → you're in with edit rights (Profile shows "Can edit"; the site
   record header shows "Auditor · editing").
3. Open it again in a private window, enter the **viewer** passcode → read-only (no edit controls,
   but can still log new findings).
4. **Shared-data check:** as the auditor, change a finding's status; refresh the viewer window → the
   change is there. 🎉  That's real shared data.
5. Health: `https://<your-url>/api/health` → `{"ok":true,"db":true,"auth":"passcode"}`.

**Sharing with the team:** send them the URL + the appropriate passcode. To change a passcode later,
edit `AUDITOR_PASSCODE` / `VIEWER_PASSCODE` in the Render service's **Environment** tab (it redeploys
automatically). Everyone signed in stays signed in for 8 hours.

---

## Costs & limits (free tier)

- **Free web service** sleeps after ~15 min idle (~30s cold start on the next visit). Upgrade to a
  paid instance (~$7/mo) to keep it always warm.
- **Free PostgreSQL** is removed after ~30 days. For anything real, upgrade `athens-db` to a paid
  plan (from ~$7/mo) so data persists. (Change `plan: free` in `render.yaml` or upgrade in the
  dashboard.)
- Photos are stored as base64 in DB rows — fine for light use; move to blob storage (S3 / Azure
  Blob) if usage grows.

## Notes

- **Branch:** `render.yaml` deploys from `claude/new-session-x35f9w` (the repo's current default
  branch). If you make `main` the default later, update `branch:` in `render.yaml`.
- **The GitHub Pages site** stays as a no-login **demo** (bundled data, localStorage). The Render URL
  is the real shared-data app.
- **Security:** in production the API refuses to run with no login configured (returns 503), so the
  database is never exposed by an accidental misconfiguration. Use long, random passcodes.

---

## Appendix — Upgrade to Microsoft Entra (Azure AD) SSO later

When IT can register an app, switch from passcodes to per-person Microsoft sign-in with **no code
change** — just env vars.

### 1. Register the app in Entra (needs an Azure AD admin)
At **https://entra.microsoft.com → Applications → App registrations → New registration**:
- Name `Athens Facility Compliance`; **Single tenant**.
- **Redirect URI** (Web): `https://<your-render-url>/auth/redirect`.
- After registering, copy **Application (client) ID** and **Directory (tenant) ID**.
- **Certificates & secrets → New client secret** → copy the secret **Value**.
- *(Optional)* **App roles**: create roles with values **`Auditor`** and **`Viewer`**, then assign
  users under **Enterprise applications → Users and groups**.

### 2. Set env vars on Render (service → Environment)
- `ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_SECRET` — from above.
- `ENTRA_REDIRECT_URI` = `https://<your-render-url>/auth/redirect` (must match the Azure value).
- `AUDITOR_EMAILS` = comma-separated auditor emails *(if you didn't use App roles)*.
- *(Optional)* clear `AUDITOR_PASSCODE` / `VIEWER_PASSCODE` — Entra takes precedence either way.

Save → Render redeploys. The login screen now shows **"Sign in with Microsoft"**, and roles come
from the Entra token (app roles) or the `AUDITOR_EMAILS` allowlist.
