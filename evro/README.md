# Athens EVRO — Enterprise Value Realization Office (PoC)

A working proof-of-concept cost-management platform for Athens Services, built
with the **same toolchain as the facilities-compliance app** in this repo:
React 18 + Vite (vanilla CSS, hand-built SVG charts — no Tailwind/Recharts),
Node + Express over PostgreSQL serving the SPA **and** `/api` from one origin,
a JSON seed as the source of truth, a bundled snapshot for demo/offline mode,
and a server engine mirrored by an identical client engine.

It seeds from the real **2025 Athens AP register**: **$437.4M addressable spend**
across **116 categories → 14 sourcing groups**, plus ~40 initiatives, 10
opportunities and a demo roster so every screen renders alive on first load.

> **Responsive** across desktop, laptop, tablet and phone — a fluid content area
> with a desktop sidebar that collapses to a mobile drawer.

## The organizing principle — return-maximization, not target-attainment

There is **no enterprise savings target and no avoidance target anywhere**. Both
pillars (Cost Savings and Cost Avoidance) are fully tracked, validated and
*ranked as sources of return*:

- **Biggest Return** — sort by risk-adjusted value (RAV).
- **Best ROI** — sort by RAV ÷ effort.

Only **FP&A-validated** monthly actuals count as **Realized**. Risk-Adjusted
Value = gross × stage confidence (25/50/75/100%) × realization factor.

### Cost methodology (per the brief + McKinsey should-cost)
- **Cost Reduction** = historical baseline price − final negotiated price (active elimination).
- **Cost Savings** = original cost − new lower cost (productivity).
- **Cost Avoidance** = projected future cost − actual cost after intervention (prevented increase).
- **Implemented vs negotiated** leakage is tracked — a negotiated discount only saves money if real volume flows through the contract.
- Opportunity bands read from a **configurable `savings_pct` table** (seeded 3% / 6%, **illustrative — pending Supply Chain / FP&A validation**), never hardcoded.

## Screens

Executive · Portfolio (Biggest Return / Best ROI) · Forecast workbench
(Committed / Expected / Upside) · Initiative detail (validation-gated stage
tracker with the $100K Steering threshold, baseline formula, actuals, risks,
audit trail) · Intake · Opportunity board (claim → spins up a pre-tagged
initiative) · Spend Explorer (group→category drill, Pareto, maverick/off-contract
signal) · Leaderboard (Total FY, split attribution) · Reporting workspace
(forecast & implications, P&L split, validation-log export) · Sustainability ·
Methodology.

## Run locally

### Demo mode (no backend — fully functional, like the facilities app)
```bash
cd evro/frontend && npm install && npm run dev   # http://localhost:5174
```
No backend → the SPA loads the bundled snapshot and persists writes to
localStorage. The data-source badge shows **Demo**.

### Full stack (Express + PostgreSQL)
Local Postgres in this sandbox runs as the `postgres` user:
```bash
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | head -1)
mkdir -p /tmp/evropg && chown postgres:postgres /tmp/evropg
su postgres -c "$PGBIN/initdb -D /tmp/evropg -A trust"
su postgres -c "$PGBIN/pg_ctl -D /tmp/evropg -o '-p 5601 -k /tmp' -l /tmp/evropg.log start"
su postgres -c "$PGBIN/createdb -p 5601 -h /tmp evro"

cd evro/frontend && npm install && npm run build
cd ../server && npm install
PGHOST=/tmp PGPORT=5601 PGUSER=postgres PGDATABASE=evro PORT=4100 NODE_ENV=production node src/index.js
# open http://localhost:4100/  → live (postgres) mode end-to-end
```

## Regenerating the seed
`data/seed.json` and `frontend/src/lib/seed-snapshot.js` are **generated** —
edit `data/gen-seed.mjs` then:
```bash
node evro/data/gen-seed.mjs
```
The generator is deterministic (fixed PRNG seed), so output is stable.

## Machine-readable surfaces (open mode, CORS `*`)
| URL | What |
|---|---|
| `/api/db` | Whole portfolio (groups, categories, initiatives, opportunities, people) |
| `/api/exec` | Executive rollup (engine-computed) |
| `/api/portfolio` | Diagnostics: headline, scenarios, funnel, top returns, leaderboard |
| `/api/action` | `POST` — audited write (apply a mutation reducer, persist, return new db) |
| `/api/health` | Service + DB status |
| `/overview` | Server-rendered HTML summary (no JS) |
| `/llms.txt` | Plain-text guide for AI tools |

## Layout
```
evro/
  data/gen-seed.mjs            Deterministic seed generator (SOURCE OF TRUTH)
  data/seed.json               Generated seed (server reads this)
  frontend/
    src/lib/engine.js          Deterministic engine (RAV/ROI/forecast/leaderboard/…)
    src/lib/mutations.js       Pure write reducers (optimistic local + server mirror)
    src/lib/seed-snapshot.js   Generated bundled snapshot (demo mode)
    src/pages/                 Exec, Portfolio, Forecast, Initiative, Intake,
                               Opportunities, Spend, Leaderboard, Reporting,
                               Sustainability, Methodology
    src/components/            NavBar, Charts (SVG), ui atoms, Icons
  server/
    src/engine.js              ← identical copy of frontend engine (mirror)
    src/mutations.js           ← identical copy of frontend mutations (mirror)
    src/store.js               loadDb() / persistMutable()
    src/index.js               Express app (SPA + /api + diagnostics)
    src/diagnostics.js         portfolio JSON / overview HTML / llms.txt
    db/migrate.js              Tables + content-hash-gated reseed
  render.yaml                  Render blueprint (open mode)
```

## Notes / PoC scope
Local only; no SSO; integration adapters are out of scope (seeded from the
cube). Every write is appended to an immutable `audit_log`; the validation log is
exportable from the Reporting workspace. Demo people and example dollar figures
are illustrative placeholders, not real Athens data.
