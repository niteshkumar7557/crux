# Domain Page, Trending Domains & Pagination — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/domain?q=<slug>` page (paginated, server-filtered) replacing `/archive`, a "Trending Domains" sidebar with an All Domains link, a Domains navbar tab, and a reusable `Pagination` UI primitive.

**Architecture:** New read-only backend endpoint `GET /arena/statements?domainId=&page=&pageSize=` returns `{ statements, total, page, pageSize }`. A server-component page resolves `?q=` slugs against `/domains`, renders the archive-style chips + ArenaCard grid, and paginates via URL links. Sidebar/navbar/search links repoint; `/archive` is deleted.

**Tech Stack:** Next.js 16 App Router (server components), Tailwind v4 semantic tokens, Express + pg on the backend, Lucide icons via `react-icons/lu`.

**Spec:** `docs/superpowers/specs/2026-07-15-domain-page-design.md`

## Global Constraints

- **NEVER run `git commit`** — the user commits. Finish, verify, hand over a commit message ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- No test framework exists in this repo. Verification = `npx tsc --noEmit` + `npm run lint` (both must stay at **zero** problems, run in `frontend/`), `curl` probes against the backend (`:8000`, tsx watch hot-reloads), and a Playwright MCP sweep (zero console errors / pageerrors).
- Token discipline: only semantic tokens from `globals.css` (`surface-container*`, `outline`, `outline-variant`, `primary`, `on-surface-variant`, …). No `gray-*`/hex literals. Radius 0 (no `rounded` except `rounded-full` pills). No new shadows. No texture overlays.
- Fonts via existing utility classes only: `font-label` (Space Grotesk micro-labels), `font-headline` (Newsreader italic), `font-body` (Manrope).
- Icons: Lucide only. `LuArrowLeft`, `LuArrowRight`, `LuMessageSquare` are verified to exist in the installed react-icons v5.6.0.
- Frontend files in this repo use 2-space indentation except `StatementForm.tsx` (tabs) — match whatever file you edit.
- Dev servers: frontend `npm run dev` → :3000, backend `npm run dev` → :8000, Postgres via `docker-compose.dev.yml`. Backend base URL for the frontend proxy is `/api/*` → :8000.

---

### Task 1: Backend endpoint `GET /arena/statements`

**Files:**
- Modify: `backend/src/controllers/arena.controller.ts` (append new export after `getLeaderboardData`)
- Modify: `backend/src/routes/arena.route.ts`

**Interfaces:**
- Produces: `GET /arena/statements?domainId=<int>&page=<int>&pageSize=<int>` → `200 { statements: Row[], total: number, page: number, pageSize: number }` where `Row = { username, avatar, domain, title, affirmativescore, negativescore, argumentid, time, argumentNum }` (same shape as `/arena/active/newest` rows — Postgres lowercases the unquoted aliases; `"argumentNum"` is quoted). `page` in the response is the **clamped** page.
- Defaults: no `domainId` = all domains; `page` defaults 1, clamped to `[1, totalPages]`; `pageSize` defaults 12, clamped `[1, 50]`. Junk params fall back to defaults. Errors → `200 { statements: [], total: 0, page: 1, pageSize: 12 }`.

- [x] **Step 1: Add the controller function**

Append to `backend/src/controllers/arena.controller.ts` (after `getLeaderboardData`):

```ts
export async function getStatements(req: Request, res: Response) {
  try {
    const domainId = Number.parseInt(String(req.query.domainId ?? ""), 10);
    const hasDomain = Number.isInteger(domainId) && domainId > 0;

    let pageSize = Number.parseInt(String(req.query.pageSize ?? ""), 10);
    if (!Number.isInteger(pageSize)) pageSize = 12;
    pageSize = Math.min(Math.max(pageSize, 1), 50);

    let page = Number.parseInt(String(req.query.page ?? ""), 10);
    if (!Number.isInteger(page) || page < 1) page = 1;

    const filterParams: number[] = [];
    let where = "";
    if (hasDomain) {
      filterParams.push(domainId);
      where = `WHERE a.domain_id = $${filterParams.length}`;
    }

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM arguments a ${where};`,
      filterParams,
    );
    const total: number = totalResult.rows[0].total;

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    if (page > totalPages) page = totalPages;

    const statements = await pool.query(
      `
                SELECT
                    u.username,
                    u.avatar,
                    d.name AS domain,
                    a.content AS title,
                    a.affirmative AS affirmativeScore,
                    a.negative AS negativeScore,
                    a.id AS argumentId,
                    a.created_at AT TIME ZONE 'UTC' AS time,
                    COALESCE(c.count, 0)::int AS "argumentNum"
                FROM arguments a
                JOIN users u ON a.user_id = u.id
                JOIN domains d ON d.id = a.domain_id
                LEFT JOIN (
                    SELECT argument_id, COUNT(*) AS count
                    FROM comments c
                    GROUP BY argument_id
                ) c ON a.id = c.argument_id
                ${where}
                ORDER BY a.id DESC
                LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2};
            `,
      [...filterParams, pageSize, (page - 1) * pageSize],
    );

    res
      .status(200)
      .json({ statements: statements.rows, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(200).json({ statements: [], total: 0, page: 1, pageSize: 12 });
  }
}
```

- [x] **Step 2: Register the route**

In `backend/src/routes/arena.route.ts`, add `getStatements` to the import from `../controllers/arena.controller.js` and add below the leaderboard line:

```ts
arenaRoutes.get("/statements", getStatements);
```

- [x] **Step 3: Verify with curl** (backend hot-reloads via tsx watch; seed has 18 statements)

```bash
curl -s "localhost:8000/arena/statements" | head -c 400                     # total: 18, 12 rows, page 1
curl -s "localhost:8000/arena/statements?page=2" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['total'], d['page'], len(d['statements']))"   # 18 2 6
curl -s "localhost:8000/arena/statements?domainId=1" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['total'], {s['domain'] for s in d['statements']})"  # only 'Technology & AI'
curl -s "localhost:8000/arena/statements?page=99" | python3 -c "import json,sys; print(json.load(sys.stdin)['page'])"   # clamped to last page
curl -s "localhost:8000/arena/statements?domainId=junk&page=junk&pageSize=junk" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['page'], d['pageSize'])"  # 1 12
```

---

### Task 2: Slug helper + shared types

**Files:**
- Create: `frontend/app/_utils/domainSlug.ts`
- Modify: `frontend/app/types.ts` (append)

**Interfaces:**
- Produces: `slugifyDomain(name: string): string` — `"Technology & AI"` → `"technology-ai"`.
- Produces types: `DomainInfo { id: number; name: string }`, `PaginatedStatements { statements: NewestCardProps[]; total: number; page: number; pageSize: number }`.

- [x] **Step 1: Create `frontend/app/_utils/domainSlug.ts`**

```ts
// URL slug for a domain name: "Technology & AI" -> "technology-ai".
// Deterministic over the fixed 12-domain taxonomy; resolve a slug by
// slugifying the /domains list and matching.
export function slugifyDomain(name: string): string {
  return name.toLowerCase().replace(/&/g, " ").trim().replace(/\s+/g, "-");
}
```

- [x] **Step 2: Append to `frontend/app/types.ts`**

```ts
export interface DomainInfo {
  id: number;
  name: string;
}

export interface PaginatedStatements {
  statements: NewestCardProps[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [x] **Step 3: Verify**

Run in `frontend/`: `npx tsc --noEmit` → clean.

---

### Task 3: `Pagination` UI primitive

**Files:**
- Create: `frontend/app/_components/ui/Pagination.tsx`

**Interfaces:**
- Consumes: nothing project-specific (pure presentational server component).
- Produces: default export `Pagination({ page, totalPages, totalItems, itemLabel, hrefFor })` — `hrefFor: (page: number) => string`. Renders `null` when `totalPages <= 1`. Current page is a `<span aria-current="page">`, edge PREV/NEXT are disabled spans, gaps are inert `…` cells.

- [x] **Step 1: Create the component**

```tsx
import Link from "next/link";
import { LuArrowLeft, LuArrowRight } from "react-icons/lu";

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel: string;
  hrefFor: (page: number) => string;
};

const pad = (n: number) => String(n).padStart(2, "0");

// Window: first + last + current ±1; null marks a collapsed gap.
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const pages: (number | null)[] = [];
  let last = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      if (last && p - last > 1) pages.push(null);
      pages.push(p);
      last = p;
    }
  }
  return pages;
}

const CELL =
  "min-w-9 h-9 px-2 inline-flex items-center justify-center font-label text-xs uppercase tracking-widest";
const IDLE =
  "border border-outline-variant bg-surface-container text-on-surface-variant hover:border-primary hover:text-primary transition-colors";
const ACTIVE = "border border-primary text-primary bg-primary/5";
const DISABLED = "border border-outline-variant/40 text-outline-variant";

const Pagination = ({
  page,
  totalPages,
  totalItems,
  itemLabel,
  hrefFor,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-12 border-t border-outline-variant/50 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-label text-[10px] uppercase tracking-widest text-outline">
        Page {pad(page)} / {pad(totalPages)} · {totalItems} {itemLabel}
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={`${CELL} gap-2 ${IDLE}`}>
            <LuArrowLeft aria-hidden />
            <span className="hidden sm:inline">Prev</span>
          </Link>
        ) : (
          <span aria-disabled="true" className={`${CELL} gap-2 ${DISABLED}`}>
            <LuArrowLeft aria-hidden />
            <span className="hidden sm:inline">Prev</span>
          </span>
        )}
        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className={`${CELL} text-outline-variant`}>
              …
            </span>
          ) : p === page ? (
            <span key={p} aria-current="page" className={`${CELL} ${ACTIVE}`}>
              {pad(p)}
            </span>
          ) : (
            <Link key={p} href={hrefFor(p)} className={`${CELL} ${IDLE}`}>
              {pad(p)}
            </Link>
          ),
        )}
        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={`${CELL} gap-2 ${IDLE}`}>
            <span className="hidden sm:inline">Next</span>
            <LuArrowRight aria-hidden />
          </Link>
        ) : (
          <span aria-disabled="true" className={`${CELL} gap-2 ${DISABLED}`}>
            <span className="hidden sm:inline">Next</span>
            <LuArrowRight aria-hidden />
          </span>
        )}
      </nav>
    </div>
  );
};

export default Pagination;
```

- [x] **Step 2: Verify**

Run in `frontend/`: `npx tsc --noEmit` and `npm run lint` → both clean. (Visual verification happens in Task 4 once the page renders it.)

---

### Task 4: `/domain` page

**Files:**
- Create: `frontend/app/domain/page.tsx`

**Interfaces:**
- Consumes: `GET /domains` → `{ domains: DomainInfo[] }`; `GET /arena/statements` (Task 1); `slugifyDomain`, `DomainInfo`, `PaginatedStatements` (Task 2); `Pagination` (Task 3); existing `ArenaCard`, `Button`, `Reveal`, `timeAgo`, `serverApi`.
- Produces: route `/domain?q=<slug|all>&page=<n>`. `q` defaults to `all`; unknown slug → empty state, no statements fetch.

- [x] **Step 1: Create `frontend/app/domain/page.tsx`**

```tsx
export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { LuMessageSquare } from "react-icons/lu";
import serverApi from "@/app/axios.server";
import ArenaCard from "@/app/_components/arena/ArenaCard";
import Button from "@/app/_components/ui/Button";
import Pagination from "@/app/_components/ui/Pagination";
import Reveal from "@/app/_components/ui/Reveal";
import { DomainInfo, PaginatedStatements } from "@/app/types";
import { slugifyDomain } from "@/app/_utils/domainSlug";
import { timeAgo } from "@/app/_utils/timeAgo";

type SearchParams = Promise<{ q?: string; page?: string }>;

async function fetchDomains(): Promise<DomainInfo[]> {
  try {
    const { data } = await serverApi.get("/domains");
    return Array.isArray(data.domains) ? data.domains : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q || q === "all") return { title: "Domains" };
  const domains = await fetchDomains();
  const match = domains.find((d) => slugifyDomain(d.name) === q);
  return { title: match ? match.name : "Domains" };
}

const chipClass = (active: boolean) =>
  `${active ? "border-primary text-primary bg-primary/5" : "border-outline-variant bg-surface-container text-on-surface-variant"} border px-4 py-2 font-label text-xs uppercase hover:border-primary hover:text-primary transition-colors`;

const DomainPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { q, page: pageParam } = await searchParams;
  const slug = q || "all";
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const requestedPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const domains = await fetchDomains();
  const activeDomain =
    slug === "all"
      ? null
      : (domains.find((d) => slugifyDomain(d.name) === slug) ?? null);
  const unknownSlug = slug !== "all" && activeDomain === null;

  let result: PaginatedStatements = {
    statements: [],
    total: 0,
    page: 1,
    pageSize: 12,
  };
  if (!unknownSlug) {
    try {
      const { data } = await serverApi.get("/arena/statements", {
        params: {
          ...(activeDomain ? { domainId: activeDomain.id } : {}),
          page: requestedPage,
        },
      });
      if (Array.isArray(data.statements)) result = data;
    } catch (error) {
      console.error("Failed to load domain statements:", error);
    }
  }

  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const heading = activeDomain ? activeDomain.name : "All Battlegrounds";

  return (
    <Reveal
      key={`${slug}-${result.page}`}
      className="max-w-6xl mx-auto px-6 md:px-8 py-12"
    >
      <div data-reveal className="mb-12 border-l-4 border-tertiary pl-6">
        <span className="font-label text-tertiary text-xs uppercase tracking-[0.3em] mb-2 block">
          THE BATTLEGROUNDS
        </span>
        <h1 className="font-headline italic text-5xl md:text-6xl text-on-background tracking-tight">
          {heading}
        </h1>
        <p className="mt-4 text-on-surface-variant font-body text-lg max-w-xl">
          {unknownSlug
            ? "This battleground does not exist."
            : `${result.total} statement${result.total === 1 ? "" : "s"} on the record.`}
        </p>
      </div>

      {domains.length > 0 && (
        <div data-reveal className="flex flex-wrap gap-2 mb-8">
          <Link href="/domain?q=all" className={chipClass(slug === "all")}>
            All
          </Link>
          {domains.map((d) => {
            const domainSlug = slugifyDomain(d.name);
            return (
              <Link
                key={d.id}
                href={`/domain?q=${domainSlug}`}
                className={chipClass(slug === domainSlug)}
              >
                {d.name}
              </Link>
            );
          })}
        </div>
      )}

      {result.statements.length === 0 ? (
        <div
          data-reveal
          className="bg-surface-container-low border-l-2 border-outline-variant/30 p-12 text-center"
        >
          <p className="font-headline italic text-2xl text-on-surface mb-3">
            {unknownSlug
              ? "No such battleground."
              : activeDomain
                ? `No statements filed under ${activeDomain.name}.`
                : "The arena is empty."}
          </p>
          <p className="font-body text-sm text-outline mb-8">
            {unknownSlug
              ? "Pick a battleground above to browse the record."
              : activeDomain
                ? "Be the first to open this battleground."
                : "No claims have entered the arena yet."}
          </p>
          <Button href="/statement" size="lg">
            Start a Debate
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
          {result.statements.map((e) => (
            <ArenaCard
              key={e.argumentid}
              username={e.username}
              domain={e.domain}
              title={e.title}
              affirmativescore={e.affirmativescore}
              negativescore={e.negativescore}
              argumentid={e.argumentid}
              time={timeAgo(e.time)}
              footerLeft={
                <>
                  <LuMessageSquare className="inline text-primary" />{" "}
                  {e.argumentNum} Arguments
                </>
              }
            />
          ))}
        </div>
      )}

      <div data-reveal>
        <Pagination
          page={result.page}
          totalPages={totalPages}
          totalItems={result.total}
          itemLabel={result.total === 1 ? "statement" : "statements"}
          hrefFor={(p) => `/domain?q=${encodeURIComponent(slug)}&page=${p}`}
        />
      </div>
    </Reveal>
  );
};

export default DomainPage;
```

- [x] **Step 2: Verify types/lint**

Run in `frontend/`: `npx tsc --noEmit` and `npm run lint` → both clean.

- [x] **Step 3: Verify in browser (Playwright MCP)**

- `/domain?q=all` → heading "All Battlegrounds", 13 chips ("All" active), 12 cards, pagination shows `PAGE 01 / 02 · 18 STATEMENTS`, PREV disabled.
- Click `02` → URL `/domain?q=all&page=2`, 6 cards, NEXT disabled.
- Click the "Technology & AI" chip → `/domain?q=technology-ai`, heading "Technology & AI", only that domain's cards, no pagination if ≤ 12 statements, page param reset.
- `/domain?q=nonsense` → "No such battleground." empty state, chips still visible, no console errors.
- Zero console errors / pageerrors on all of the above.

---

### Task 5: Sidebar — Trending Topics → Trending Domains

**Files:**
- Rename: `frontend/app/_components/arena/TrendingTopics.tsx` → `frontend/app/_components/arena/TrendingDomains.tsx`
- Rename: `frontend/app/_components/arena/TrendingTopicsCard.tsx` → `frontend/app/_components/arena/TrendingDomainCard.tsx`
- Modify: `frontend/app/types.ts` (rename `TrendingTopicsCardProps`/`TrendingTopicsCardData` → `TrendingDomainCardProps`/`TrendingDomainCardData`)
- Modify: `frontend/app/_components/arena/ArenaSidebar.tsx` (imports, type, state name)

**Interfaces:**
- Consumes: `slugifyDomain` (Task 2). Backend `/arena/sidebar` `data1` rows already carry real domain names as `topic` — no backend change.
- Produces: `TrendingDomains({ data: TrendingDomainCardData })`, `TrendingDomainCard(props: TrendingDomainCardProps)` — a `<Link>` to `/domain?q=<slug>`.

- [x] **Step 1: Rename the type in `frontend/app/types.ts`**

Replace the `TrendingTopicsCardProps` block with:

```ts
export interface TrendingDomainCardProps {
  topic: string;
  changePercentage: number;
  arguments: number;
  liveBattles: number;
}
export type TrendingDomainCardData = TrendingDomainCardProps[];
```

- [x] **Step 2: Create `TrendingDomainCard.tsx`** (delete `TrendingTopicsCard.tsx`)

```tsx
import Link from "next/link";
import { TrendingDomainCardProps } from "@/app/types";
import { slugifyDomain } from "@/app/_utils/domainSlug";

const TrendingDomainCard = ({
  topic,
  changePercentage,
  arguments: argumentsCount,
  liveBattles,
}: TrendingDomainCardProps) => {
  return (
    <Link href={`/domain?q=${slugifyDomain(topic)}`} className="group block">
      <div className="flex justify-between items-start mb-1">
        <span className="font-body capitalize text-sm font-bold group-hover:text-primary transition-colors">
          {topic}
        </span>
        <span
          className={`font-label text-[10px] ${changePercentage >= 0 ? "text-primary-container bg-primary-container/10" : "text-secondary-container bg-secondary-container/10"} px-1.5`}
        >
          {changePercentage > 0 ? `+${changePercentage}` : changePercentage}%
        </span>
      </div>
      <div className="text-[10px] font-label text-outline uppercase tracking-widest">
        {argumentsCount} Arguments • {liveBattles} Live Battles
      </div>
    </Link>
  );
};

export default TrendingDomainCard;
```

- [x] **Step 3: Create `TrendingDomains.tsx`** (delete `TrendingTopics.tsx`)

```tsx
import Link from "next/link";
import TrendingDomainCard from "./TrendingDomainCard";
import { TrendingDomainCardData } from "@/app/types";

const TrendingDomains = ({ data }: { data: TrendingDomainCardData }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-label text-xs uppercase tracking-[0.3em] text-outline flex items-center gap-2">
          <span className="w-8 h-px bg-outline-variant"></span>
          Trending Domains
        </h4>
        <Link
          href={"/domain?q=all"}
          className="font-label text-[10px] text-primary uppercase tracking-widest hover:underline"
        >
          All Domains
        </Link>
      </div>
      <div className="space-y-4">
        {data.length > 0 &&
          data.map((e, i) => (
            <TrendingDomainCard
              key={i}
              topic={e.topic}
              changePercentage={e.changePercentage}
              arguments={e.arguments}
              liveBattles={e.liveBattles}
            />
          ))}
      </div>
    </div>
  );
};

export default TrendingDomains;
```

- [x] **Step 4: Update `ArenaSidebar.tsx`**

- Import `TrendingDomains` from `./TrendingDomains` (drop `TrendingTopics`).
- Import `TrendingDomainCardData` instead of `TrendingTopicsCardData`.
- Rename state: `trendingTopicsData`/`setTrendingTopicsData` → `trendingDomainsData`/`setTrendingDomainsData` (type `TrendingDomainCardData`).
- Render `<TrendingDomains data={trendingDomainsData} />`.

- [x] **Step 5: Verify**

`npx tsc --noEmit` + `npm run lint` clean; also `grep -rn "TrendingTopics" frontend/app` → no hits. In the browser: home sidebar shows "Trending Domains" + "ALL DOMAINS" link (visually matches "FULL STANDINGS"), clicking a trending entry lands on `/domain?q=<slug>` with that domain active.

---

### Task 6: Navbar — Domains tab

**Files:**
- Modify: `frontend/app/_components/Navbar.tsx`

**Interfaces:**
- Produces: nav order Arena · Domains · Leaderboard; Domains → `/domain?q=all`; active state works for hrefs carrying a query string.

- [x] **Step 1: Add the link and fix the active check**

In `Navbar.tsx` replace the `navLinks` array:

```tsx
const navLinks = [
  { label: "Arena", href: "/" },
  { label: "Domains", href: "/domain?q=all" },
  { label: "Leaderboard", href: "/leaderboard" },
];
```

In the map, `usePathname()` has no query string, so compare against the href's path part. Replace the className ternary's condition `pathname === e.href` with `pathname === e.href.split("?")[0]`.

- [x] **Step 2: Verify**

`npx tsc --noEmit` + lint clean. Browser: Domains tab shows between Arena and Leaderboard, is highlighted (cyan underline) on `/domain?q=all` **and** `/domain?q=technology-ai`, and not on `/`; Arena tab still highlights only on `/`.

---

### Task 7: Repoint search, delete `/archive`

**Files:**
- Modify: `frontend/app/_components/SearchBar.tsx` (domain result links, ~line 207)
- Delete: `frontend/app/archive/` (whole directory)

**Interfaces:**
- Consumes: `slugifyDomain` (Task 2).

- [x] **Step 1: Repoint SearchBar domain results**

Add `import { slugifyDomain } from "../_utils/domainSlug";` and change the domain-result link:

```tsx
href={`/domain?q=${slugifyDomain(result.domain)}`}
```

(replacing `href={`/archive?domain=${encodeURIComponent(result.domain)}`}`).

- [x] **Step 2: Delete the archive route**

```bash
rm -rf frontend/app/archive
grep -rn "archive" frontend/app --include="*.tsx"   # expect zero hits
```

- [x] **Step 3: Verify**

`npx tsc --noEmit` + lint clean. Browser: search for a domain word (e.g. "tech"), click the domain result → lands on `/domain?q=technology-ai`; `/archive` now renders the branded 404.

---

### Task 8: Full verification sweep + handoff

**Files:**
- Modify: `docs/frontend-audit.md` (routes table: replace the `/archive` row with `/domain`; §8: remove the archive/newest-LIMIT-20 bullet, note pagination now exists on `/domain`)

- [x] **Step 1: Quality gates**

```bash
cd frontend && npx tsc --noEmit && npm run lint
```

Expected: zero errors, 0 lint problems.

- [x] **Step 2: Playwright MCP sweep**

Navigate `/`, `/domain?q=all`, `/domain?q=all&page=2`, `/domain?q=technology-ai`, `/domain?q=nonsense`, `/statement`, `/argument/CRX-1-A`, `/leaderboard`, `/archive` (404 page) collecting console errors + pageerrors — must be zero (ignore a one-time `ChunkLoadError` right after a dev-server restart; re-run to confirm).

- [x] **Step 3: Responsive + motion checks**

- At 390px on `/domain?q=all`: `scrollWidth === clientWidth`; chips wrap; pagination stacks (readout above controls).
- Emulate `prefers-reduced-motion: reduce` on `/domain?q=all`: no element left dimmed/transformed (Reveal end state `opacity: 1`).
- Screenshot desktop (1440) + mobile (390) of `/domain?q=all` and one filtered domain.

- [x] **Step 4: Update `docs/frontend-audit.md`** per the Files note above.

- [x] **Step 5: Hand over the commit message** (do NOT commit):

```
feat: /domain page with pagination — replaces /archive; trending domains + navbar tab

- GET /arena/statements: paginated, domain-filterable statement feed (total + clamped page)
- /domain?q=<slug>&page=<n>: chips for all 12 domains, ArenaCard grid, empty states
- new reusable ui/Pagination primitive (windowed pages, zero-padded cells)
- sidebar Trending Topics -> Trending Domains with All Domains link; cards link to /domain
- navbar Domains tab; search domain results repoint; /archive deleted

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

## Self-review notes

- Spec coverage: slug helper (T2), backend endpoint (T1), page incl. unknown slug + metadata (T4), pagination primitive incl. windowing/disabled/readout (T3), trending domains + All Domains link + clickable cards (T5), navbar (T6), search repoint + archive deletion (T7), audit doc + verification (T8). Error handling matches spec (tolerant 200s, try/catch → empty states).
- Type names consistent: `DomainInfo`, `PaginatedStatements`, `TrendingDomainCardProps/Data`, `slugifyDomain`, `getStatements`.
- No placeholders; all code complete.
