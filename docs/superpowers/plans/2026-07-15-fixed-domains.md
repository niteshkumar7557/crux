# Fixed 12-Domain Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Constrain every statement to one of 12 predefined domains stored in a new `domains` table, replacing the free-form `arguments.domain` string.

**Architecture:** A migration creates + seeds the `domains` lookup table, backfills `arguments.domain_id`, and drops the old varchar column. Backend readers JOIN `domains` and keep serving `domain` as a string, so the API shape (and all frontend types) stay unchanged. The AI arbiter prompt is constrained to the closed list; statement creation resolves `domain_id` by name with a fallback to the user's chip pick.

**Tech Stack:** Express + pg (raw SQL, no ORM), plain `.sql` migrations run by `backend/src/db/migrate.ts` (each file wrapped in one transaction), Next.js App Router frontend, axios (`serverApi` for server components, `api` for client).

**Spec:** `docs/superpowers/specs/2026-07-15-fixed-domains-design.md`

## Global Constraints

- **No git commits.** The user commits themselves — finish with a suggested commit message instead (standing user preference).
- The 12 domains, with fixed IDs, verbatim: 1 Technology & AI, 2 Science, 3 Politics & Governance, 4 Economics & Business, 5 Environment & Energy, 6 Health & Medicine, 7 Law & Justice, 8 Society & Culture, 9 Ethics & Philosophy, 10 Education, 11 Sports & Gaming, 12 Media & Entertainment.
- API responses keep the field name `domain` (a string, the domain's `name`) everywhere they exist today. No frontend type changes.
- There is no test framework in this repo; every task verifies by running real commands (SQL via `npx tsx -e`, HTTP via `curl`) and checking output.
- Backend dev server: `cd backend && npm run dev` (tsx watch, port from `backend/src/config`, default check with `curl -s localhost:4000/health` — confirm the port in `backend/src/config/index.ts` if 4000 fails). Postgres runs via `docker compose -f docker-compose.dev.yml up -d` from the repo root if not already up.

---

### Task 1: Migration — `domains` table, backfill, drop old column

**Files:**
- Create: `backend/src/db/migrations/0006_create_domains.sql`

**Interfaces:**
- Produces: table `domains(id SERIAL PK, name VARCHAR(40) UNIQUE NOT NULL)` holding the 12 rows; `arguments.domain_id INT NOT NULL REFERENCES domains(id)`; `arguments.domain` no longer exists. All later tasks depend on this schema.

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE domains (
    id SERIAL PRIMARY KEY,
    name VARCHAR(40) UNIQUE NOT NULL
);

INSERT INTO domains (id, name) VALUES
    (1, 'Technology & AI'),
    (2, 'Science'),
    (3, 'Politics & Governance'),
    (4, 'Economics & Business'),
    (5, 'Environment & Energy'),
    (6, 'Health & Medicine'),
    (7, 'Law & Justice'),
    (8, 'Society & Culture'),
    (9, 'Ethics & Philosophy'),
    (10, 'Education'),
    (11, 'Sports & Gaming'),
    (12, 'Media & Entertainment');

SELECT setval(pg_get_serial_sequence('domains', 'id'), 12);

ALTER TABLE arguments ADD COLUMN domain_id INT REFERENCES domains(id);

UPDATE arguments SET domain_id = CASE
    WHEN LOWER(domain) IN ('technology', 'tech', 'ai', 'social media') THEN 1
    WHEN LOWER(domain) IN ('science', 'atmospheric science') THEN 2
    WHEN LOWER(domain) IN ('geopolitics', 'policy', 'politics', 'political science') THEN 3
    WHEN LOWER(domain) IN ('economics', 'finance', 'business') THEN 4
    WHEN LOWER(domain) IN ('environment', 'energy', 'climate policy', 'energy policy') THEN 5
    WHEN LOWER(domain) IN ('health', 'public health', 'medicine') THEN 6
    WHEN LOWER(domain) IN ('law', 'privacy', 'justice') THEN 7
    WHEN LOWER(domain) IN ('society', 'culture') THEN 8
    WHEN LOWER(domain) IN ('ethics', 'philosophy', 'ai ethics') THEN 9
    WHEN LOWER(domain) = 'education' THEN 10
    WHEN LOWER(domain) IN ('sports', 'gaming') THEN 11
    WHEN LOWER(domain) IN ('media', 'entertainment') THEN 12
    ELSE 8
END;

ALTER TABLE arguments ALTER COLUMN domain_id SET NOT NULL;

ALTER TABLE arguments DROP COLUMN domain;
```

(The migration runner wraps the whole file in BEGIN/COMMIT — no explicit transaction statements. The 12 names are intentionally duplicated in the AI prompt (Task 4); the DB is the runtime source of truth, the prompt is static text.)

- [ ] **Step 2: Run the migration**

Run: `cd backend && npm run db:migrate:dev`
Expected: `✅ ran       0006_create_domains.sql` then `✅ 1 migration(s) complete`. (If Postgres is down: `docker compose -f ../docker-compose.dev.yml up -d` first.)

- [ ] **Step 3: Verify schema and backfill**

Run (from `backend/`):
```bash
npx tsx -e "
import pool from './src/db/index.js';
const d = await pool.query('SELECT id, name FROM domains ORDER BY id');
console.log(d.rows);
const a = await pool.query('SELECT d.name, COUNT(*)::int FROM arguments a JOIN domains d ON d.id = a.domain_id GROUP BY d.name ORDER BY 2 DESC');
console.log(a.rows);
await pool.end();
"
```
Expected: 12 domain rows with IDs 1–12 in the order from Global Constraints; every argument grouped under one of the 12 names (18 seed statements total, zero rows lost). Old `domain` column gone — `SELECT domain FROM arguments` must error.

---

### Task 2: `GET /domains` endpoint

**Files:**
- Create: `backend/src/controllers/domain.controller.ts`
- Create: `backend/src/routes/domain.route.ts`
- Modify: `backend/src/app.ts` (route registration block)

**Interfaces:**
- Consumes: `domains` table from Task 1.
- Produces: `GET /domains` → `200 {"domains":[{"id":1,"name":"Technology & AI"}, …]}` ordered by id. Task 6 (frontend) consumes this.

- [ ] **Step 1: Write the controller**

`backend/src/controllers/domain.controller.ts`:
```ts
import type { Request, Response } from "express";
import pool from "../db/index.js";

export async function getDomains(req: Request, res: Response) {
  try {
    const { rows } = await pool.query(`
                SELECT id, name
                FROM domains
                ORDER BY id ASC;
            `);
    res.status(200).json({ domains: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ domains: [] });
  }
}
```

- [ ] **Step 2: Write the route**

`backend/src/routes/domain.route.ts`:
```ts
import { Router } from "express";
import { getDomains } from "../controllers/domain.controller.js";

const domainRoutes = Router();

domainRoutes.get("/", getDomains);

export default domainRoutes;
```

- [ ] **Step 3: Register in `app.ts`**

Add with the other imports:
```ts
import domainRoutes from "./routes/domain.route.js";
```
Add in the routes block (after the `/search` line, before `/avatar`):
```ts
app.use("/domains", domainRoutes);
```

- [ ] **Step 4: Verify**

Run: `curl -s localhost:4000/domains` (backend dev server running)
Expected: JSON with all 12 domains, ids 1–12, ordered.

---

### Task 3: Update backend readers to JOIN `domains`

**Files:**
- Modify: `backend/src/controllers/arena.controller.ts` (`getActiveCardData`, `getTrendingCardData`, `getNewestCardData`, `getSidebarData`)
- Modify: `backend/src/controllers/search.controller.ts` (`searchAll`)
- Modify: `backend/src/controllers/argument.controller.ts` (`getArgumentById` only — creation is Task 4)

**Interfaces:**
- Consumes: schema from Task 1.
- Produces: identical JSON shapes as before — `domain` (string) in active/trending/newest cards and search results, `topic` (string) in sidebar. Frontend needs no changes.

- [ ] **Step 1: `getActiveCardData`** — replace the first query with:

```ts
    const argument = await pool.query(`
                SELECT a.id, a.user_id, a.content, d.name AS domain, a.affirmative, a.negative
                FROM arguments a
                JOIN domains d ON d.id = a.domain_id
                ORDER BY a.id DESC
                LIMIT 1;
            `);
```

- [ ] **Step 2: `getTrendingCardData`** — replace `a.domain` in SELECT with `d.name AS domain`, add `JOIN domains d ON d.id = a.domain_id` after `JOIN users u …`, and change `GROUP BY … a.domain …` to `GROUP BY a.id, u.username, u.avatar, d.name, a.content, a.affirmative, a.negative`.

- [ ] **Step 3: `getNewestCardData`** — replace `a.domain,` in SELECT with `d.name AS domain,` and add `JOIN domains d ON d.id = a.domain_id` after `JOIN users u ON a.user_id = u.id`.

- [ ] **Step 4: `getSidebarData`** — first query becomes:

```ts
    const data1 = await pool.query(`
            SELECT
                d.name AS topic,
                ROUND(AVG(a.affirmative - a.negative))::numeric AS "changePercentage",
                COUNT(DISTINCT c.id)::int AS arguments,
                COUNT(DISTINCT a.id)::int AS "liveBattles"
            FROM arguments a
            JOIN domains d ON d.id = a.domain_id
            LEFT JOIN comments c ON c.argument_id = a.id
            GROUP BY d.name
            ORDER BY arguments DESC
            LIMIT 3;
        `);
```

- [ ] **Step 5: `searchAll`** — statements query: `a.domain` → `d.name AS domain` plus `JOIN domains d ON d.id = a.domain_id`. Domains query becomes:

```ts
      pool.query(
        `
                SELECT d.name AS domain, COUNT(*)::int AS "statementCount"
                FROM arguments a
                JOIN domains d ON d.id = a.domain_id
                WHERE d.name ILIKE $1 ESCAPE '\\'
                GROUP BY d.name
                ORDER BY "statementCount" DESC
                LIMIT $2;
            `,
        [pattern, RESULT_LIMIT],
      ),
```

- [ ] **Step 6: `getArgumentById`** — replace `SELECT * FROM "arguments" WHERE id = $1;` with:

```ts
      `
                SELECT a.*, d.name AS domain
                FROM arguments a
                JOIN domains d ON d.id = a.domain_id
                WHERE a.id = $1;
            `,
```

(Keeps `domain` present for any consumer even though the argument page doesn't currently read it; `domain_id` also comes along via `a.*`, which is harmless.)

- [ ] **Step 7: Verify all read endpoints**

Run:
```bash
curl -s localhost:4000/arena/active/main | head -c 400; echo
curl -s localhost:4000/arena/active/trending | head -c 400; echo
curl -s localhost:4000/arena/active/newest | head -c 400; echo
curl -s localhost:4000/arena/sidebar | head -c 400; echo
curl -s "localhost:4000/search?q=tech" | head -c 400; echo
curl -s localhost:4000/argument/1 | head -c 400; echo
```
Expected: every payload contains `"domain"` (or `"topic"` for sidebar) with one of the 12 canonical names; no 500s, no empty `{}` responses (seed data exists).

---

### Task 4: Statement creation — closed-list AI prompt + `domain_id` insert

**Files:**
- Modify: `backend/src/controllers/ai.controller.ts` (`[domain]` rules + 4 examples)
- Modify: `backend/src/controllers/argument.controller.ts` (`addNewArgument`)
- Modify: `frontend/app/_components/statement/StatementForm.tsx` (`handleSubmit` body)

**Interfaces:**
- Consumes: `domains` table; existing `POST /ai/statement` and `POST /argument` endpoints.
- Produces: `POST /ai/statement` returns `domain` ∈ the 12 names. `POST /argument` accepts body `{ user_id, content, content_keyword, domain, selected_domain }` and stores `domain_id`; returns 400 `{"error":"Unknown domain."}` if neither `domain` nor `selected_domain` matches a `domains.name`.

- [ ] **Step 1: Constrain the arbiter prompt** — in `ai.controller.ts`, replace the whole `[domain]` rules block (the 8 lines starting `- The user will provide a domain label…` through `- Bad: "stuff"…`) with:

```
            [domain]
            - Choose EXACTLY one name from this closed list, copied verbatim (including "&"):
              Technology & AI | Science | Politics & Governance | Economics & Business | Environment & Energy | Health & Medicine | Law & Justice | Society & Culture | Ethics & Philosophy | Education | Sports & Gaming | Media & Entertainment
            - The user-provided domain is a hint. If it is on the list and plausibly fits the statement, return it unchanged.
            - If it does not fit the statement, return the best-fitting list name instead.
            - NEVER output a name that is not on the list. No inventing, shortening, or combining names.
```

Then fix the four examples' outputs: `"domain": "Social Media"` → `"Technology & AI"`; `"Atmospheric Science"` → `"Science"`; `"Political Science"` → `"Politics & Governance"`; `"Energy Policy"` → `"Environment & Energy"`. Also update the example inputs' hint labels to plausible chip values: `Domain: "tech"` → `Domain: "Technology & AI"`, `Domain: "science"` → `Domain: "Science"`, `Domain: "random stuff"` → `Domain: "Society & Culture"`, `Domain: "cooking"` → `Domain: "Sports & Gaming"` (the last one deliberately keeps a wrong-bucket hint to demonstrate reassignment).

- [ ] **Step 2: Resolve and store `domain_id` in `addNewArgument`** — change the body type and add resolution before the AI call:

```ts
  const data: {
    user_id: number;
    content: string;
    content_keyword: string;
    domain: string;
    selected_domain?: string;
  } = req.body;

  const domainResult = await pool.query(
    `
        SELECT id, name FROM domains
        WHERE name = $1 OR name = $2
        ORDER BY (name = $1) DESC
        LIMIT 1;
        `,
    [data.domain, data.selected_domain ?? ""],
  );
  if (domainResult.rows.length === 0) {
    return res.status(400).json({ error: "Unknown domain." });
  }
  const { id: domainId, name: domainName } = domainResult.rows[0];
```

Use the resolved name in the analysis prompt (`Domain: ${domainName}` instead of `${data.domain}`), and change the INSERT to:

```ts
    const { rows } = await pool.query(
      `
        INSERT INTO arguments (user_id, content_keyword, content, domain_id, for_analysis, against_analysis) VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id;
        `,
      [
        data.user_id,
        data.content_keyword,
        data.content,
        domainId,
        parsed.for_analysis,
        parsed.against_analysis,
      ],
    );
```

- [ ] **Step 3: Send the user's pick from the form** — in `StatementForm.tsx` `handleSubmit`, the `api.post("/argument", …)` body gains one field:

```ts
				await api.post("/argument", {
					user_id: user.id,
					content: formState.text,
					content_keyword: formState.keyword,
					domain: formState.domain,
					selected_domain: formState.selectedDomain,
				});
```

- [ ] **Step 4: Verify the AI returns on-list domains**

Run (needs `GROQ` key configured in backend env, which dev already has):
```bash
curl -s -X POST localhost:4000/ai/statement -H 'Content-Type: application/json' \
  -d '{"content":"Video games cause more creativity than they destroy attention spans","domain":"Science"}'
```
Expected: JSON whose `domain` is exactly one of the 12 (likely `Sports & Gaming` or `Technology & AI` — the point is list membership, not which). Repeat with a mismatched hint to confirm reassignment stays on-list.

- [ ] **Step 5: Verify creation path end-to-end at the API level**

`POST /argument` requires no auth middleware (matches current behavior — check `backend/src/routes/argument.route.ts` and reuse whatever it requires). Run:
```bash
curl -s -X POST localhost:4000/argument -H 'Content-Type: application/json' \
  -d '{"user_id":1,"content":"Esports deserve Olympic status.","content_keyword":"Olympic status","domain":"Sports & Gaming","selected_domain":"Sports & Gaming"}'
```
Expected: `{"message":"Argument with id: N added successfully!"}`. Then confirm storage:
```bash
cd backend && npx tsx -e "
import pool from './src/db/index.js';
const r = await pool.query('SELECT a.id, d.name FROM arguments a JOIN domains d ON d.id=a.domain_id ORDER BY a.id DESC LIMIT 1');
console.log(r.rows);
await pool.end();
"
```
Expected: newest row shows `Sports & Gaming`. Also verify the 400: same curl with `"domain":"Nonsense","selected_domain":"Nonsense"` → `{"error":"Unknown domain."}` (this fails before any AI call).

---

### Task 5: Seed uses canonical names + `domain_id`

**Files:**
- Modify: `backend/src/db/seed.ts`

**Interfaces:**
- Consumes: `domains` table (seed runs after migrations; it TRUNCATEs only `users, arguments, comments, refresh_tokens` — never `domains`).
- Produces: 18 seed statements carrying `domain_id`, distributed across the 12 canonical domains.

- [ ] **Step 1: Replace the 18 `domain:` values** in `STATEMENTS` with canonical names, in file order:

| old | new |
|---|---|
| technology (×2) | Technology & AI |
| society (×2) | Society & Culture |
| economics | Economics & Business |
| science (×2) | Science |
| finance | Economics & Business |
| environment | Environment & Energy |
| law | Law & Justice |
| energy | Environment & Energy |
| policy | Politics & Governance |
| education (×2) | Education |
| health | Health & Medicine |
| privacy | Law & Justice |
| culture | Society & Culture |
| sports | Sports & Gaming |

(`domain: string` in `SeedStatement` stays — it now holds the canonical name.)

- [ ] **Step 2: Insert `domain_id`** — right before the arguments insert block, load the lookup:

```ts
    const domainRows = await client.query("SELECT id, name FROM domains");
    const domainIds = new Map<string, number>(
      domainRows.rows.map((r: { id: number; name: string }) => [r.name, r.id]),
    );
```

In the `argValues.push(...)` call replace `s.domain` with:

```ts
        domainIds.get(s.domain) ??
          (() => {
            throw new Error(`Unknown seed domain: ${s.domain} — run migrations first`);
          })(),
```

and in the INSERT column list change `domain` to `domain_id`.

- [ ] **Step 3: Rebuild and verify**

Run: `cd backend && npm run db-init`
Expected: migration reports up-to-date, seed logs `✅ Seeded 20 users`, `✅ Seeded 18 arguments`, comments, no errors. Then re-run the Task 1 Step 3 verification snippet: 18 statements spread over ~10 of the 12 domains, all names canonical.

---

### Task 6: Statement form shows the 12 chips from the API

**Files:**
- Modify: `frontend/app/statement/page.tsx`
- Modify: `frontend/app/_components/statement/StatementForm.tsx` (initial `selectedDomain` only)

**Interfaces:**
- Consumes: `GET /domains` (Task 2) via `serverApi` (same pattern as `frontend/app/argument/[id]/page.tsx`).
- Produces: `StatementForm` still receives `domains: string[]` (`DomainClassification` unchanged).

- [ ] **Step 1: Fetch domains server-side** — replace `frontend/app/statement/page.tsx` content:

```tsx
import StatementHeader from "../_components/statement/StatementHeader";
import CruxAIRoleInfo from "../_components/statement/CruxAIRoleInfo";
import { DomainClassification } from "./types";
import StatementForm from "../_components/statement/StatementForm";
import Reveal from "../_components/ui/Reveal";
import serverApi from "@/app/axios.server";

const page = async () => {
  let domains: DomainClassification = [];
  try {
    const { data } = await serverApi.get("/domains");
    domains = data.domains.map((d: { id: number; name: string }) => d.name);
  } catch {
    domains = [];
  }

  return (
    <div className="min-h-screen pt-22 pb-20 px-4">
      <Reveal className="max-w-3xl mx-auto">
        <div data-reveal>
          <StatementHeader />
        </div>
        <div className="grid grid-cols-1 gap-8">
          <div data-reveal>
            <StatementForm domains={domains} />
          </div>
          <div data-reveal>
            <CruxAIRoleInfo />
          </div>
        </div>
      </Reveal>
    </div>
  );
};

export default page;
```

(Per spec: no hardcoded fallback list — on fetch failure the chips row is simply empty and the arbiter still assigns a domain from the closed list.)

- [ ] **Step 2: Default chip** — in `StatementForm.tsx`, the initial state `selectedDomain: "AI",` becomes:

```ts
			selectedDomain: domains[0] ?? "",
```

- [ ] **Step 3: Verify in the browser**

With backend and frontend dev servers running, open `/statement`: 12 chips render in canonical order, "Technology & AI" pre-selected. Type a 35+ char claim, Check eligibility → validation panel shows an on-list domain; Broadcast → redirects home and the new card shows the canonical domain.

---

### Task 7: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Rebuild from scratch** — `cd backend && npm run db-init` → clean run.
- [ ] **Step 2: TypeScript** — `cd backend && npm run build` → compiles; `cd frontend && npx tsc --noEmit` (or `npm run build` if that's the existing check) → no new errors.
- [ ] **Step 3: Walk the app** (backend + frontend dev servers): home arena cards, trending/newest tabs, sidebar topics, archive, search for "tech" and "Science", a statement detail page, and the full post-statement flow from Task 6 Step 3. Every visible domain label is one of the 12.
- [ ] **Step 4: Hand over** — report results and give the user a suggested commit message, e.g. `feat: fixed 12-domain taxonomy — domains table, closed-list arbiter, seeded chips`.

---

## Self-Review Notes

- Spec coverage: migration/backfill (T1), GET /domains (T2), reader JOINs incl. `getArgumentById` (T3), AI closed list + fallback chain + 400 (T4), seed (T5), frontend chips (T6), verification (T7). "Out of scope" items untouched. ✅
- No placeholder patterns; every code step shows the code. ✅
- Names consistent across tasks: `domain_id`, `selected_domain`, `GET /domains` → `{domains:[{id,name}]}`, `DomainClassification = string[]`. ✅
