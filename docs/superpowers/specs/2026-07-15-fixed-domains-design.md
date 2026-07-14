# Fixed 12-Domain Taxonomy — Design

**Date:** 2026-07-15
**Status:** Approved by user

## Problem

Statement domains are free-form and scattered across three inconsistent sources:

- `arguments.domain` is `VARCHAR(40)`; the AI arbiter (`ai.controller.ts`) may return any 1–2 word label ("Atmospheric Science", "Energy Policy").
- The statement form shows 5 hardcoded chips (`AI, Geopolitics, Technology, Science, Other`) in `frontend/app/statement/page.tsx`.
- Seed data uses a third lowercase set (`technology, society, finance, privacy, …`).

Result: domain grouping (arena topics, search) fragments into near-duplicate labels, and future domain-based features have no stable set to build on.

## Decision

Constrain every statement to exactly one of 12 predefined broad domains, stored in a new `domains` table:

| id | name |
|----|------|
| 1 | Technology & AI |
| 2 | Science |
| 3 | Politics & Governance |
| 4 | Economics & Business |
| 5 | Environment & Energy |
| 6 | Health & Medicine |
| 7 | Law & Justice |
| 8 | Society & Culture |
| 9 | Ethics & Philosophy |
| 10 | Education |
| 11 | Sports & Gaming |
| 12 | Media & Entertainment |

Assignment flow: the user picks one of the 12 chips on the statement form; the AI arbiter treats the pick as a hint but must return a name from the closed list — it may reassign within the list if the user picked the wrong bucket.

## Database

New migration `backend/src/db/migrations/0006_create_domains.sql`, in one transaction (the existing runner wraps each file in BEGIN/COMMIT):

1. `CREATE TABLE domains (id SERIAL PRIMARY KEY, name VARCHAR(40) UNIQUE NOT NULL)`.
2. Insert the 12 rows with explicit IDs 1–12, then `SELECT setval(pg_get_serial_sequence('domains','id'), 12)`.
3. `ALTER TABLE arguments ADD COLUMN domain_id INT REFERENCES domains(id)`.
4. Backfill from the old string via `CASE` on `LOWER(domain)`:
   - technology, ai, social media → 1 (Technology & AI)
   - science → 2
   - geopolitics, policy, politics, political science → 3
   - economics, finance → 4
   - environment, energy, climate policy, energy policy → 5
   - health, public health → 6
   - law, privacy → 7
   - society, culture → 8
   - ethics, philosophy → 9
   - education → 10
   - sports, gaming → 11
   - media, entertainment → 12
   - anything else / NULL → 8 (Society & Culture)
5. `ALTER TABLE arguments ALTER COLUMN domain_id SET NOT NULL`, then `DROP COLUMN domain`.

## Backend

- **New** `domain.route.ts` + `domain.controller.ts`: `GET /domains` → `{ domains: [{ id, name }] }`, ordered by id. Registered in the app alongside existing routes.
- **`argument.controller.ts`** (create statement): resolve `domain_id` with `SELECT id FROM domains WHERE name = $1` using the AI-validated domain; if no match (AI drifted off-list), fall back to the user's picked name; if that also misses, 400. Insert `domain_id` instead of `domain`.
- **`arena.controller.ts`, `search.controller.ts`** (and any other reader of `arguments.domain`): `JOIN domains d ON d.id = a.domain_id` and alias `d.name AS domain`. JSON shapes are unchanged — `domain` stays a string everywhere.
- **`ai.controller.ts`**: rewrite the `[domain]` field rules — "Return EXACTLY one name from this list: …12 names…. The user's pick is a hint; keep it if plausible, otherwise choose the best-fitting list entry. Never invent a name outside the list." Update the 4 few-shot examples so their `domain` outputs are list members (e.g. "Social Media" → "Technology & AI", "Atmospheric Science" → "Science", "Political Science" → "Politics & Governance", "Energy Policy" → "Environment & Energy").

## Frontend

- **`app/statement/page.tsx`**: remove the hardcoded 5-item array; fetch `GET /domains` and pass the 12 names to `StatementForm`. Chip UI unchanged, just 12 chips.
- No other frontend changes: all types already model `domain: string` and the API continues to serve that.

## Seed

`backend/src/db/seed.ts`: statements get one of the 12 canonical names; insert resolves `domain_id` (map name→id at the top of the script). Old lowercase strings replaced.

## Error handling

- `GET /domains` failure on the form → show the 12 as a hardcoded fallback is **not** done (YAGNI); form surfaces its normal error state.
- AI off-list domain → fallback chain above; statement creation never stores an unknown domain.

## Testing / verification

- `npm run db-init` (drop-free path: migration is idempotent-guarded by `_migrations`) rebuilds cleanly.
- Manual: post a statement picking a wrong chip → AI reassigns within the 12; arena topics/search group under the 12 only.

## Out of scope

- Domain-based browsing/filter pages (user's follow-up work — "add around these domains").
- Domain slugs, colors, icons — add columns later when a feature needs them.
