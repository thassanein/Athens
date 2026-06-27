# Deploy — live shared data (Render + Microsoft Entra)

This turns the app into a **real multi-user system**: one always-on server with a managed
PostgreSQL database, served at a single URL, behind **Microsoft sign-in**. Everyone who signs in
sees and edits the **same** data.

**Architecture:** one Render web service runs the Express server, which serves the built React app
**and** the `/api`. Same origin → no CORS, and login cookies just work. Data lives in Render's
managed PostgreSQL.

You'll need: a **Render** account (free to start), and someone with **Microsoft Entra (Azure AD)
admin** rights to register an app (usually your IT/M365 admin).

> Tip: do **Part 1 (Azure)** first so you have the three Entra values ready when Render asks for them.

---

## Part 1 — Register the app in Microsoft Entra (Azure AD)

1. Go to **https://entra.microsoft.com** → **Applications → App registrations → New registration**.
2. **Name:** `Athens Facility Compliance`.
3. **Supported account types:** *Accounts in this organizational directory only* (single tenant).
4. **Redirect URI:** platform **Web**, value:
   `https://athens-compliance.onrender.com/auth/redirect`
   *(This is the URL you'll get from Render in Part 2. `athens-compliance` is the service name from
   `render.yaml`; if Render gives you a different host, come back and fix this.)*
5. Click **Register**. On the overview page, copy:
   - **Application (client) ID** → this is `ENTRA_CLIENT_ID`
   - **Directory (tenant) ID** → this is `ENTRA_TENANT_ID`
6. **Certificates & secrets → New client secret** → copy the secret **Value** (not the ID) →
   this is `ENTRA_CLIENT_SECRET`. *(You can't see it again later — copy it now.)*
7. *(Optional, for role control)* **App roles → Create app role**: make two roles with values
   **`Auditor`** and **`Viewer`**, then assign users under **Enterprise applications → your app →
   Users and groups**. If you skip this, use the email allowlist in Part 3 instead.

---

## Part 2 — Create the Render service + database (from `render.yaml`)

1. Go to **https://dashboard.render.com** → **New → Blueprint**.
2. Connect your GitHub and pick **`thassanein/Athens`**. Render reads `render.yaml` and shows a
   plan: one **web service** (`athens-compliance`) + one **PostgreSQL** (`athens-db`).
3. Render will prompt for the env vars marked "sync:false". Fill in:
   - `ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_SECRET` — from Part 1.
   - `ENTRA_REDIRECT_URI` = `https://athens-compliance.onrender.com/auth/redirect`
     *(must exactly match the Azure redirect URI).*
   - `AUDITOR_EMAILS` = comma-separated emails who should get edit rights, e.g.
     `dave@athens.com,rosa@athens.com`. *(Skip if you used App roles in Part 1 step 7.)*
   - `DATABASE_URL` and `SESSION_SECRET` are wired automatically — leave them.
4. Click **Apply**. Render provisions the database, runs the build
   (`build frontend → install server`), and starts the server. First deploy takes a few minutes.
5. When it's live, note the actual URL (top of the service page). **If it isn't
   `https://athens-compliance.onrender.com`**, update both the **Azure redirect URI** (Part 1 step 4)
   and the **`ENTRA_REDIRECT_URI`** env var to match, then redeploy.

The database schema is created and seeded automatically on first boot (non-destructive — it never
wipes existing data on later deploys).

---

## Part 3 — Verify

1. Open your Render URL. You should see **"Sign in with Microsoft"** (no demo buttons).
2. Sign in with an org account → you land on the portfolio map.
3. **Roles:** an account in `AUDITOR_EMAILS` (or with the `Auditor` app role) can edit findings;
   everyone else is read-only. Profile shows your role badge; the site record header shows
   *"Auditor · editing"* or *"View only"*.
4. **Shared data check:** sign in on a second device/account, change a finding's status as an
   auditor, refresh the other device → the change is there. 🎉
5. Health check: `https://<your-url>/api/health` returns `{"ok":true,"db":true,"auth":"sso"}`.

---

## Costs & limits (free tier)

- **Free web service** sleeps after ~15 min idle (~30s cold start on the next visit). Upgrade to a
  paid instance (~$7/mo) to keep it always warm.
- **Free PostgreSQL** is removed after ~30 days. For anything real, upgrade `athens-db` to a paid
  plan (from ~$7/mo) so data persists. (Change `plan: free` in `render.yaml` or upgrade in the
  dashboard.)
- Photos are stored as base64 in the DB rows. Fine for light use; move to blob storage
  (S3 / Azure Blob) if usage grows.

## Notes

- **Branch:** `render.yaml` deploys from `claude/new-session-x35f9w` (the repo's current default
  branch). If you make `main` the default later, update `branch:` in `render.yaml`.
- **The GitHub Pages site** stays as a no-login **demo** (bundled data, localStorage). The Render URL
  is the real shared-data app. You can retire the Pages deploy or keep it for demos.
- **Security:** in production the API refuses to run without Entra configured (returns 503), so the
  database is never exposed by an accidental misconfiguration.
- **Roles in token vs allowlist:** if the Entra token includes app roles, those win; otherwise the
  `AUDITOR_EMAILS` allowlist decides; otherwise `DEFAULT_ROLE` (viewer).
