# Deployment Guide — Athens Command Center

This gets your app running at a real URL that you and your team can reach anytime, from any device. You don't need to be a developer. Budget about **15–20 minutes**.

There are two paths. Pick one:

- **Path A — Managed (recommended):** Neon hosts the database, Vercel hosts the app. Free tier covers a small team. Nobody maintains a server.
- **Path B — Your own / Athens IT PostgreSQL:** you already have (or IT will provide) a PostgreSQL database, and you just point the app at it.

Both paths use the exact same code. The only difference is where the database lives.

---

## A few values you'll need (generate these once)

**Session secret** — a long random string that signs login cookies. Generate one by running this on any computer with Node installed:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output. You'll paste it as `SESSION_SECRET` later.

**First admin login** — decide on an email and a strong password now. These create your first account:
- `SEED_ADMIN_EMAIL` — e.g. `tamer@athensservices.com`
- `SEED_ADMIN_PASSWORD` — a strong password (change it after first login)

---

# Path A — Neon + Vercel (recommended)

## Step 1 — Create the database (Neon)

1. Go to **neon.tech** and sign up (free).
2. Click **Create project**. Name it `athens` (anything is fine). Pick the region closest to you.
3. When it finishes, Neon shows a **connection string** that looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   Click **copy**. This is your `DATABASE_URL`. Keep it somewhere for the next steps.

## Step 2 — Create the tables

You'll paste the schema into Neon's built-in SQL editor — no tools to install.

1. In your Neon project, open the **SQL Editor** (left sidebar).
2. Open the file `db/schema.sql` from this repo, copy **all** of it.
3. Paste it into the SQL Editor and click **Run**.
   You should see it complete with no errors. (It creates all the tables.)

## Step 3 — Put the code on GitHub

Vercel deploys from a GitHub repo.

1. Go to **github.com**, sign in, click **New repository**. Name it `athens-command-center`. Keep it **Private**. Create it.
2. GitHub shows you commands to push code. From inside the `athens-app` folder on your computer:
   ```bash
   git init
   git add .
   git commit -m "Athens Command Center"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/athens-command-center.git
   git push -u origin main
   ```
   (If you don't use git, GitHub Desktop or even the "upload files" button on the repo page works too — just don't upload the `node_modules` folder.)

## Step 4 — Deploy the app (Vercel)

1. Go to **vercel.com** and sign up with your GitHub account (free).
2. Click **Add New… → Project**, and **Import** the `athens-command-center` repo.
3. Before clicking Deploy, expand **Environment Variables** and add these (Name → Value):

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | the Neon connection string from Step 1 |
   | `SESSION_SECRET` | the random string you generated |
   | `SEED_ADMIN_EMAIL` | your admin email |
   | `SEED_ADMIN_PASSWORD` | your admin password |
   | `NODE_ENV` | `production` |

4. Click **Deploy**. Wait ~1 minute. Vercel gives you a URL like
   `https://athens-command-center.vercel.app`.

## Step 5 — Load your data (seed)

The tables exist but are empty. Run the seed once. Easiest way, from the `athens-app` folder on your computer:

```bash
# put the SAME values in a local .env file first:
#   DATABASE_URL=...(Neon string)...
#   SEED_ADMIN_EMAIL=...
#   SEED_ADMIN_PASSWORD=...
#   PGSSL is not needed for Neon (it uses SSL by default)
npm install
npm run seed
```

You'll see `✓ Seeded 5 drivers, 18 KRs, 25 projects, 5 goals` and your admin being created.

> Seeding talks directly to the Neon database, so running it from your laptop updates the same database your live site uses.

## Step 6 — Sign in

Open your Vercel URL, log in with your admin email and password. You're live. 🎉

Add teammates: once logged in as admin, you can create logins for your team (or ask me to add a small "Manage users" screen — the API for it is already built).

---

# Path B — Your own / Athens IT PostgreSQL

If IT gives you a PostgreSQL database (on-prem or in Athens' cloud), you only need its connection string.

1. **Get the connection string** from IT. It looks like:
   ```
   postgresql://user:password@host:5432/databasename
   ```
   Ask whether it requires SSL:
   - SSL required (most managed/cloud): leave `PGSSL` unset.
   - Plain internal server, no SSL: set `PGSSL=disable`.

2. **Create the tables:**
   ```bash
   psql "postgresql://user:password@host:5432/databasename" -f db/schema.sql
   ```
   (or paste `db/schema.sql` into whatever SQL tool IT uses.)

3. **Configure and seed:** create a `.env` file (copy `.env.example`), fill in:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/databasename
   # PGSSL=disable   # only if IT says no SSL
   SESSION_SECRET=...(your random string)...
   SEED_ADMIN_EMAIL=...
   SEED_ADMIN_PASSWORD=...
   NODE_ENV=production
   ```
   then:
   ```bash
   npm install
   npm run seed
   ```

4. **Run the app.** Anywhere that runs Node works — an Athens server, a container, or a host like Vercel/Render/Railway (set the same environment variables there). Start with:
   ```bash
   npm start
   ```
   Hand IT the repo and this file; the env-variable list above is everything they need.

---

## Troubleshooting

- **"relation … does not exist"** → the schema didn't run. Re-run Step 2 (paste `db/schema.sql` and Run).
- **Login page loads but login fails** → the seed hasn't run, so no admin exists yet. Run `npm run seed`.
- **"self-signed certificate" / SSL errors on a local database** → set `PGSSL=disable` in your `.env`.
- **Can't connect at all** → double-check the `DATABASE_URL` is copied exactly, including the part after `@`.
- **Forgot the admin password** → set new `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` values and re-run `npm run seed` to create another admin (it won't duplicate an existing email).

## After you're live

- Change your admin password.
- Replace the starter progress numbers and statuses with your real reporting — just click and edit in the app.
- Upload key documents to their projects so the team has one place to find them.
