# Domain Page, Trending Domains & Pagination — Design

*2026-07-15. Approved direction from brainstorming session.*

## Goal

A canonical domain browser at `/domain?q=<slug>` that shows the statements of one domain (or all), replacing `/archive`. The home sidebar's "Trending Topics" becomes "Trending Domains" with clickable entries and an "All Domains" link. The navbar gains a "Domains" tab. The statement grid is paginated via a new reusable `Pagination` primitive.

## Decisions (locked)

1. **`/archive` is replaced** by `/domain` and deleted. The search modal's domain links (its only consumer) repoint to `/domain`.
2. **Server-side filtering** — statements are filtered by `domain_id` in SQL, not client-side over the newest-20.
3. **Slug URLs** — `?q=technology-ai`, not encoded names or ids. `all` is the reserved slug for the unfiltered view.
4. **Pagination ships on `/domain` only** for now, but the UI primitive and endpoint shape are reusable for other pages later.

## 1. Slug helper — `frontend/app/_utils/domainSlug.ts`

`slugifyDomain(name: string): string` — lowercase, strip `&`, collapse spaces to single hyphens: `"Technology & AI"` → `technology-ai`. Deterministic over the fixed 12-domain taxonomy. Resolution of slug → domain is done by slugifying the `/domains` list and matching; no reverse function needed.

## 2. Backend — `GET /arena/statements`

New read-only endpoint (arena.controller/route), query params:

| Param | Meaning | Default / bounds |
|---|---|---|
| `domainId` | filter `WHERE a.domain_id = $n` | absent = all domains |
| `page` | 1-based page | 1; clamped to `[1, totalPages]` |
| `pageSize` | rows per page | 12; clamped to `[1, 50]` |

Response: `{ statements: NewestCardProps-shaped rows, total: number }`. Same SELECT shape as `/arena/active/newest` (join users, domains, comment counts) plus `COUNT(*) OVER()` (or a second count query) for `total`, `ORDER BY a.id DESC`, `LIMIT/OFFSET`. Invalid/non-numeric params fall back to defaults. `/arena/active/newest` is left untouched.

## 3. Page — `frontend/app/domain/page.tsx`

Server component, `force-dynamic`. Reads `q` (default `all`) and `page` from searchParams.

- Fetches `/domains`; slugifies to resolve `q` → domain (id + display name). Fetches `/arena/statements` with `domainId` (omitted for `all`) and `page`.
- **Header** — archive-style accent block (`border-l-4 border-tertiary pl-6`): label `THE BATTLEGROUNDS`; headline `All Battlegrounds` for `all`, else the domain's display name (e.g. *Technology & AI*); sub-line includes the statement count.
- **Chips row** — the "select your battleground" pattern: an `All` chip (→ `/domain?q=all`) plus all 12 seeded domains (→ `/domain?q=<slug>`), active chip in the `border-primary text-primary bg-primary/5` state. All 12 always render, even for empty domains. Chip links carry no `page` param (switching domains resets to page 1).
- **Grid** — 2-col `ArenaCard` grid inside `Reveal` (keyed on `q`+`page` so navigation re-staggers), same card props as archive used.
- **Empty state** — archive's copy: "No statements filed under X. / Be the first to open this battleground." + `Start a Debate` CTA.
- **Unknown slug** — skips the statements fetch entirely and renders the empty state ("No such battleground" copy) with the chips row still visible so the user can navigate out.
- `generateMetadata` — title is the domain name, or `Domains` for `all`/unknown.

## 4. Pagination primitive — `frontend/app/_components/ui/Pagination.tsx`

Server component. Props: `page`, `totalPages`, `totalItems`, `itemLabel` (e.g. `"statements"`), `hrefFor(page: number): string`. Renders `null` when `totalPages <= 1`.

Layout: hairline-topped footer row (`mt-12 border-t border-outline-variant/50 pt-6`; `flex-col gap-4` below `sm`, `sm:flex-row sm:items-center sm:justify-between` above):

- **Left readout** — `font-label text-[10px] uppercase tracking-widest text-outline`: `PAGE 02 / 03 · 18 STATEMENTS` (zero-padded page numbers).
- **Right controls** — `<nav aria-label="Pagination">`:
  - Number cells: `min-w-9 h-9` bordered cells, radius 0, `font-label text-xs`, zero-padded labels. Idle `border-outline-variant bg-surface-container text-on-surface-variant`, hover `border-primary text-primary`, current `border-primary text-primary bg-primary/5` + `aria-current="page"` (current renders as a span, not a link).
  - PREV/NEXT: same-height cells, `LuArrowLeft`/`LuArrowRight` + word (word `hidden sm:inline`). At edges: non-link span, `text-outline-variant`, no hover.
  - Windowing: always show first + last + current ±1; gaps render as inert `…` cells. (Trivial at 2 pages, correct at 40.)
- No new shadows, no motion (page navigation re-triggers `Reveal` naturally). Focus handled by the global `:focus-visible` rule.

## 5. Sidebar — Trending Domains

- Rename `TrendingTopics.tsx` → `TrendingDomains.tsx`, `TrendingTopicsCard.tsx` → `TrendingDomainCard.tsx`; rename the matching types in `app/types.ts` and update `ArenaSidebar` imports.
- Heading text: **Trending Domains**. Add an **ALL DOMAINS** link right of the heading — identical markup/classes to Top Debaters' "Full Standings" (`font-label text-[10px] text-primary uppercase tracking-widest hover:underline`) — href `/domain?q=all`.
- Each card becomes a `<Link>` to `/domain?q=<slug>` (was a `cursor-default` div; keep the existing hover color, drop `cursor-default`).
- Backend sidebar query already returns real domain names as `topic`; no backend change.

## 6. Navbar

Add `{ label: "Domains", href: "/domain?q=all" }` between Arena and Leaderboard. Active-state check compares `usePathname()` against the href's pathname part (`href.split("?")[0]`), since `usePathname()` excludes the query string.

## 7. Cleanup

- Delete `frontend/app/archive/` (whole directory).
- `SearchBar.tsx` domain results: `/archive?domain=<name>` → `/domain?q=<slug>` (import the slug helper).

## Error handling

- `/domains` or `/arena/statements` fetch failure → page renders with empty chips/grid and the empty state (same pattern as archive's try/catch).
- Backend endpoint catches errors and returns `{ statements: [], total: 0 }` with 200, matching the existing controllers' tolerant style.

## Testing / verification

1. `cd frontend && npx tsc --noEmit` and `npm run lint` — both zero.
2. `curl` probes: `/arena/statements`, `?domainId=1`, `?page=2`, out-of-range page, junk params.
3. Playwright sweep: `/`, `/domain?q=all`, `/domain?q=technology-ai`, `/domain?q=nonsense`, `/domain?q=all&page=2`, navbar tab active state, sidebar trending link click, search-modal domain result click — zero console errors/pageerrors.
4. 390 px: `scrollWidth === clientWidth` on `/domain` (chips wrap, pagination stacks/fits).
5. Reduced-motion emulation: no dimmed/transformed leftovers on `/domain`.
6. User commits (never Claude); hand over a commit message with the Claude co-author line.

## Out of scope

- Pagination on any other page (leaderboard, home feed) — future work.
- Trending math changes, domain descriptions/icons, per-domain OG images.
