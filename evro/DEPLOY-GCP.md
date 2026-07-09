# Deploying Athens EVRO to Google Cloud

This moves EVRO from Render to **Cloud Run** (the app) + **Cloud SQL for
PostgreSQL** (the database). The app is a standard Node/Express container with a
`DATABASE_URL` Postgres connection — there is no Render-specific code, so this is
packaging + wiring, not a rewrite.

> Everything below is done from the `evro/` directory unless noted.
> Replace `PROJECT_ID` and `REGION` (e.g. `us-central1`) with your own.

---

## 0. One-time setup

```bash
# Install & sign in (skip if you already have gcloud)
#   https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project PROJECT_ID
gcloud config set run/region REGION

# Enable the services we use
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
```

---

## 1. Create the database (Cloud SQL for PostgreSQL)

```bash
# Smallest instance is fine for a PoC. (No perpetual free tier — ~$8–10/mo.)
gcloud sql instances create athens-sql \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=REGION

# A database and a user
gcloud sql databases create athens_evro --instance=athens-sql
gcloud sql users create evro --instance=athens-sql --password='CHOOSE_A_STRONG_PASSWORD'

# Note the instance connection name — looks like PROJECT_ID:REGION:athens-sql
gcloud sql instances describe athens-sql --format='value(connectionName)'
```

The app creates its own tables and seeds them on first boot (from
`data/seed.json`), so an **empty** database is all you need. To also carry over
live edits you made on Render, see **§5 (optional data copy)**.

---

## 2. Deploy the app (Cloud Run)

The `Dockerfile` in this folder builds the frontend and runs the server. Deploy
straight from source — Cloud Build builds the image and Cloud Run runs it:

```bash
INSTANCE=$(gcloud sql instances describe athens-sql --format='value(connectionName)')

gcloud run deploy athens-evro \
  --source . \
  --allow-unauthenticated \
  --add-cloudsql-instances="$INSTANCE" \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="DATABASE_URL=postgresql://evro:CHOOSE_A_STRONG_PASSWORD@/athens_evro?host=/cloudsql/$INSTANCE"
```

- `--add-cloudsql-instances` mounts a secure Unix socket at
  `/cloudsql/$INSTANCE`; the `host=` in `DATABASE_URL` points `pg` at it (no
  public IP, no IP allow-listing needed).
- `--allow-unauthenticated` keeps the app public, matching today's open mode.

Cloud Run prints a URL like `https://athens-evro-XXXX.run.app`. Open it — the
app runs, and on boot the server migrates + seeds the database.

---

## 3. Turn on EVRO AI (the copilot)

Store the key in Secret Manager (better than a plain env var), then reference it:

```bash
printf 'sk-ant-YOUR-KEY' | gcloud secrets create anthropic-api-key --data-file=-

gcloud run services update athens-evro \
  --update-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest"
# Optional tuning (same knobs as before):
#   --set-env-vars="AI_MODEL=claude-haiku-4-5,AI_DAILY_CAP=200"
```

Verify: open `https://YOUR-RUN-URL/api/ai/selftest` → expect `"ok":true`.

---

## 4. Point your domain (optional)

```bash
gcloud run domain-mappings create --service=athens-evro --domain=evro.yourdomain.com
```
Then add the DNS records it prints. (Or keep the `run.app` URL.)

---

## 5. (Optional) copy live data from Render

Only needed if you want to keep edits made in the Render database rather than
re-seeding fresh.

```bash
# a) Dump from Render (Dashboard → your DB → "External Database URL")
pg_dump --no-owner --no-privileges \
  --table='evro_*' \
  "postgresql://USER:PASS@RENDER_HOST/RENDER_DB" > evro_dump.sql

# b) Load into Cloud SQL (easiest: Cloud SQL Studio, or the proxy below)
#    Cloud SQL Auth Proxy: https://cloud.google.com/sql/docs/postgres/sql-proxy
./cloud-sql-proxy PROJECT_ID:REGION:athens-sql &
psql "postgresql://evro:PASSWORD@127.0.0.1:5432/athens_evro" < evro_dump.sql
```

Because the app only re-seeds when the seed *content hash* changes, imported data
survives normal reboots. Set `AUTO_RESEED=false` on the Cloud Run service if you
want to be certain a boot never re-seeds.

---

## 6. Decommission Render

Once the Cloud Run URL is verified (app loads, `/api/ai/selftest` ok, data
present), suspend/delete the Render service and database.

---

## Cost sketch (PoC scale)

| Resource | Rough monthly |
|---|---|
| Cloud Run | ~$0 (generous free tier; scales to zero when idle) |
| Cloud SQL `db-f1-micro` | ~$8–10 (no free tier — the main cost) |
| Anthropic usage | pay-as-you-go, bounded by `AI_DAILY_CAP` |

Cheaper DB alternative: keep Cloud Run and use a free managed Postgres such as
**Neon** or **Supabase** — just set `DATABASE_URL` to their connection string and
skip §1 and `--add-cloudsql-instances`.
