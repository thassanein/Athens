# Athens OS — Data Model (Phase 5B)

Athens OS is the first production operating system on top of EVRO. This document
records the **net-new foundation entities** added in Phase 5B Wave 1 (5B.1) and
how the pre-existing EVRO entities satisfy the brief's Section 6 model. It is the
reference for future waves (Knowledge Layer, AI Shell, Governance, Assembly).

## Storage conventions (unchanged)

- Every table is a thin `(id TEXT PRIMARY KEY, data JSONB)` envelope, prefixed
  `evro_` so EVRO can share a PostgreSQL instance without collision.
- **Source of truth:** `evro/data/gen-seed.mjs` (deterministic generator) →
  `data/seed.json` + `frontend/src/lib/seed-snapshot.js` (bundled demo snapshot).
  Regenerate with `node evro/data/gen-seed.mjs`, then `npm run sql` in
  `evro/server` to refresh `schema.sql` / `seed.sql`.
- The frontend reads the whole cube from `GET /api/db` (Postgres mode) or the
  bundled snapshot (demo/offline mode). `api.js` **backfills** any missing
  top-level collection from the snapshot, so a returning demo user picks up new
  entities without losing their local edits.

## Section 6 entity coverage

| Brief entity | Where it lives | Status |
|---|---|---|
| `OrganizationNode` | `org_nodes` table | **New (5B.1)** |
| `User` | `people` | Existing |
| `Initiative` | `initiatives` | Existing |
| `ValueModel` | embedded on initiative (`baseline`, `benefit_lines`, `gross_annual_value`, `negotiated_value`, `realization_factor`) | Existing |
| `ForecastScenario` | `forecast_scenarios` table | **New (5B.1)** |
| `Risk` | embedded `initiative.risks[]` | Existing |
| `Approval` | embedded `initiative.request` (+ `validations[]`) | Existing |
| `Comment` | embedded `initiative.comments[]` | Existing |
| `ActivityLog` | `audit_log` | Existing |
| `KnowledgeCard` | `knowledge_cards` table | **New (5B.1)** |
| `DecisionJournal` | `decision_journal` table | **New (5B.1)** |
| `AIRecommendation` | `ai_recommendations` table | **New (5B.1)** |

## New tables

### `evro_org_nodes` — configurable org hierarchy
Athens' structure is **data, not code**. One `enterprise` root; two dimensions
hang off it. Derived from the seeded people/initiatives so the tree always
matches live tags.

| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `org-region-inland-empire` |
| `type` | enum | `enterprise` · `region` · `yard` · `business_unit` · `department` |
| `name` | string | display name |
| `parent_id` | string \| null | tree edge |
| `dimension` | enum | `enterprise` · `geography` (region→yard) · `operating` (business_unit, department) |
| `meta` | object | free-form (e.g. `{fiscalYear}`) |

### `evro_forecast_scenarios` — Base / Aggressive / Conservative / Custom
Presentation **assumption lenses** the UI can apply on top of the engine's
forecast. **Not** a change to the forecast engine and **not** a savings target.

| Field | Type | Notes |
|---|---|---|
| `id` / `key` | string | `base` · `aggressive` · `conservative` · `custom` |
| `name`, `description` | string | |
| `assumptions` | object | `{ realization_multiplier, timing_shift_months, adoption_factor }` |
| `editable` | bool | only `custom` is editable |
| `is_default` | bool | `base` is the plan of record |

### `evro_knowledge_cards` — glossary + explainability substrate
No glossary source was supplied, so these are sensible EVRO defaults (22 cards).
Powers hover help, "Explain This", and the Knowledge Layer (Wave 4).

| Field | Type | Notes |
|---|---|---|
| `id`, `term` | string | |
| `category` | enum | `value` · `method` · `finance` · `governance` |
| `aka` | string[] | aliases for lookup (e.g. `["RAV"]`) |
| `short` | string | one-liner |
| `definition` | string | full definition |
| `formula`, `example` | string \| null | optional |
| `levels` | object | `{ beginner, practitioner, executive }` audience modes |
| `related` | string[] | related card ids |

### `evro_decision_journal` — traceable consequential calls
| Field | Type | Notes |
|---|---|---|
| `id`, `at` | string | ISO date |
| `title`, `decision`, `rationale` | string | |
| `decided_by` | string | person id |
| `evidence` | string[] | what backed the call |
| `outcome`, `lessons` | string | |
| `linked_initiative_id` | string \| null | |

### `evro_ai_recommendations` — deterministic, rules-based (no LLM)
Derived from real portfolio signals (inflation exposure, unvalidated actuals,
open opportunities, high risks, concentration, leakage). Every row is flagged
`rules_based: true` and carries a confidence + evidence + value impact.

| Field | Type | Notes |
|---|---|---|
| `id`, `agent` | string | e.g. `Realization Agent` |
| `title`, `recommendation` | string | |
| `confidence` | number | 0–1 |
| `evidence` | string[] | |
| `value_impact` | number \| null | $ where quantifiable |
| `category` | enum | `governance` · `opportunity` · `risk` · `value` |
| `status` | enum | `open` (future waves: `actioned` · `dismissed`) |
| `rules_based` | bool | always `true` — no LLM |
| `linked_id` | string \| null | initiative/opportunity id |

## Read accessors — `frontend/src/lib/model.js`

Pure, defensive helpers over the new collections (no engine/business logic):
`orgTree`, `orgByDimension`, `orgByType`, `scenarios`, `defaultScenario`,
`scenario`, `knowledgeCard`, `knowledgeIndex`, `knowledgeByCategory`, `explain`,
`decisionJournal`, `aiRecommendations`.

## Files touched (5B.1)

- `data/gen-seed.mjs` — generates the 5 new entity arrays (deterministic).
- `data/seed.json`, `frontend/src/lib/seed-snapshot.js` — regenerated.
- `server/db/migrate.js` — DDL + `TABLES` + seeding for the 5 tables.
- `server/db/make-sql.mjs`, `schema.sql`, `seed.sql` — portable SQL regenerated.
- `server/src/store.js` — `loadDb` loads all 5; `persistMutable` also persists
  `decision_journal` + `ai_recommendations` (writable by future waves).
- `frontend/src/lib/api.js` — additive schema backfill for cached demo dbs.
- `frontend/src/lib/model.js` — **new** read accessors.

## Integration seams (future ERP/API — Wave 7)

`org_nodes` is the mapping surface for an external HR/org source; `knowledge_cards`
can be sourced from a governed glossary system; `ai_recommendations` currently
computes from seed signals and can later be produced by a scheduled rules
service. None of these require engine changes.
