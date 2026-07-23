# Crux Frontend — State of the Makeover

*Updated 2026-07-14 on branch `frontend-makeover` (HEAD `be3b0ab`). This replaces the original pre-makeover audit: all 10 items of that plan have shipped. This document describes the **final state** of the frontend so a fresh session can start improvements without re-deriving context.*

*Updated 2026-07-17: the `/statement` posting flow was redesigned (see §4a).*

> **Scope note (2026-07-22).** This file is the **frontend design system and working
> rules** — tokens, motion, component conventions, and the verification workflow. It is
> still current for all of that. It predates the v1 game restructure, so for anything about
> *game rules, schema, or backend flows* read [`game-theory.md`](./game-theory.md) (the
> spec) and [`CODEBASE_GUIDE.md`](./CODEBASE_GUIDE.md) (the code map) instead — they win on
> those topics. §8's list of rough edges is a backlog, not a status report; several items
> have since been fixed.

**Direction (agreed, still in force):** audience = general consumers · vibe = sleek dark-tech · motion = tasteful accents (GSAP).

---

## 1. Non-negotiable working rules

These came from explicit user feedback during the makeover. Do not relitigate them.

1. **The user commits. Never run `git commit`** — finish the work, verify it, and hand over a commit message (ending with the Claude co-author line).
2. **No noise/grain/texture overlays anywhere.** Depth comes only from the surface-container ramp, accent borders, and the tokenized glows. A texture pass was tried and explicitly rejected ("old was better").
3. **Home probability bars stay on the vivid pair** `bg-primary-container` / `bg-secondary-container` (`#00d1ff` / `#ff525d`). The argument-page hero bar uses the soft pair (`bg-primary` / `bg-secondary`). This split is intentional.
4. **Red is stance, not decoration.** Secondary (red) always means "against/negative". The avatar hash palette deliberately excludes red for this reason (cyan/amber only); comment cards force the accent by stance.
5. **Token discipline:** no `neutral-*`/`zinc-*`/`gray-*`/`stone-*` or hex literals in components — only the semantic tokens in `globals.css`. Shadows only via the three glow tokens. Radius stays 0px (only pills are round).
6. Match existing file indentation exactly when editing — `StatementForm.tsx` uses TAB indentation inside function bodies.

## 2. Stack & architecture (current)

| Aspect | State |
|---|---|
| Framework | Next.js 16.2.7 (App Router) + React 19.2.4, TypeScript. `output: "standalone"`, `/api/*` rewrite proxy to the Express backend. |
| Styling | Tailwind CSS v4, CSS-first: **all tokens in `frontend/app/globals.css` `@theme`** (no tailwind.config). Custom classes: `.technical-grid` / `.perspective-grid`, global `:focus-visible` rule. |
| Motion | `gsap` + `@gsap/react`. Central util `app/_utils/gsap.ts` registers `useGSAP`, `SplitText`, `ScrollTrigger` and exports `MOTION_OK` (see §6). |
| Icons | **Lucide only** (`react-icons/lu`) — the 13 mixed families were purged. react-icons is v5.6.0: several older Lucide aliases don't exist (`LuUserCircle2`, `LuAlertTriangle`, `LuBarChart3` → use `LuCircleUserRound`, `LuTriangleAlert`, `LuChartColumn`). **Verify exports with `node -e "require('react-icons/lu')"` before using a new icon.** |
| Data | Server components fetch via `app/axios.server.ts` (baseURL from `NEXT_PUBLIC_API_URL` = `http://localhost:8000`); client via `app/axios.ts` (Bearer from localStorage, 401→refresh interceptor). |
| Auth | JWT in localStorage (`access_token`), decoded shape in `app/_types/jwt.ts` (`jwtPayload`: id, role, username, email, exp, iat). `getUser()` in `_utils/getUser.ts` handles decode + refresh. |
| Quality gates | `npx tsc --noEmit` clean; `npm run lint` **0 errors** (was 31 problems pre-makeover). Keep errors at zero. Three `no-unused-vars` **warnings** currently sit in `_components/arena/ArenaPrimaryCard.tsx` (`settledSide`, `LuBadgeCheck`, `status`) — pre-existing and unrelated to the profile redesign; clear them when that card is next touched. |
| Dev servers | frontend `npm run dev` → :3000 (Next 16 daemonizes; logs at `.next/dev/logs/next-development.log`); backend `npm run dev` (tsx watch) → :8000; Postgres via `docker-compose.dev.yml`. |

### Routes (all real — no stubs remain)

| Route | Notes |
|---|---|
| `/` | Arena home: `ActiveArguments` (featured + trending/newest tabs) + `ArenaSidebar` (fetches `/arena/sidebar` client-side). |
| `/login`, `/register` | Auth pages (route group hides navbar/footer via `ConditionalLayout`); consumer labels, GSAP entrances. |
| `/statement` | Staged claim submission (2026-07-17 redesign): compose → Arbiter verdict → broadcast on one evolving surface with a progress rail. See §4a. |
| `/argument/[id]` | Debate arena: SplitText hero, probability bar draw + count-up, For/Against `CaseColumn`s, sticky `ArgumentInput`. |
| `/profile/me`, `/profile/[username]` | Career dossier. Identity + standing SSR; ledger, argument pattern, live debates and concluded history in one client fetch below the fold. `/profile/me` is a client shim to the canonical handle URL; numeric segments redirect. |
| `/leaderboard` | **Real page** ("The Elite Hierarchy"): asymmetric top-3 podium (crowned apex + silver/bronze flanks) + striped standings table. Data from new backend endpoint `GET /arena/leaderboard` (top 50: id, name, username, logicScore, rank, statementCount, argumentCount). Podium requires ≥3 ranked users, else flat list. |
| `/rules` | Real static "Rules of Engagement" (6 numbered rules + CTA). Linked from footer and the abuse toast. |
| `/about` | Real static "Where logic decides." (3 accent pillars + CTAs). |
| `/domain` | Canonical **domain browser** (`?q=<slug>` or `?q=all`, `&page=<n>`; replaced the old `/archive`). Server-filtered via `GET /arena/statements`, all-12 seeded chips, `ArenaCard` grid, `ui/Pagination` footer. Slugs via `_utils/domainSlug.ts` (`"Technology & AI"` → `technology-ai`). Search domain results and the sidebar's Trending Domains link here; navbar has a Domains tab. |
| Page states | Root `loading.tsx`, `error.tsx`, branded `not-found.tsx`; route-level `loading.tsx` for `/argument/[id]` and `/profile/[username]`. |

## 3. Design system reference

Tokens live in `frontend/app/globals.css` `@theme` (M3-style dark ramp):

- **Surfaces:** `background`/`surface` `#131314`; ramp `surface-container-lowest #0e0e0f` → `-low #1c1b1c` → `#201f20` → `-high #2a2a2b` → `-highest #353436`.
- **Accents:** `primary #a4e6ff` (+ `primary-container #00d1ff`), `secondary #ffb3b2` (+ `secondary-container #ff525d`), `tertiary #ffd690`. Text `on-surface #e5e2e3`, muted `outline #859399`, hairlines `outline-variant #3c494e`.
- **Glow shadows (the only shadows besides Tailwind's stock ones):** `shadow-glow-primary`, `shadow-glow-secondary`, `shadow-glow-marker`.
- **Type:** `font-headline` = Newsreader (italic serif for headlines/quotes), `font-body` = Manrope, `font-label` = Space Grotesk (tracked-out uppercase micro-labels). All three loaded once via `next/font` in `layout.tsx` as CSS variables — never instantiate fonts per-component.
- **Radius:** 0px everywhere; `rounded-full` only for pills/dots.
- **Focus:** global `:focus-visible` (2px `primary-container` outline). Components with `focus:outline-none` must ship a visible replacement (SearchBar uses `focus-within:border-primary/50` on its header row).
- Skip link in `ConditionalLayout` (`-translate-y-24 focus:translate-y-0` pattern); one `<main id="main-content">` per route (auth pages own theirs).

## 4. Component system (`app/_components/`)

**`ui/` primitives:**
- `Button.tsx` — the only CTA. Variants `solid | outline | outline-secondary | outline-neutral`, sizes `sm | md | lg | bare` (bare = caller controls padding). Renders `<Link>` when `href` is passed. Has real disabled styling.
- `Avatar.tsx` — brand avatar. Optional `src` (the `users.avatar` path, e.g. `/avatars/presets/preset-07.svg` or `/uploads/avatars/u2-<uuid>.webp`) renders the image via `next/image` (`fill`, `unoptimized`, prefixed with `/api` so the Next rewrite proxies to the backend). Without `src`: initials (splits on space/`_`/`.`/`-`) on `surface-container-high` chip, accent auto-hashed from username (cyan/amber only) or forced via `accent="primary"|"secondary"` (comment cards pass stance). Sizes `sm md lg xl 2xl`. The picker/upload UI is `profile/AvatarEditor.tsx`, shown on your own `/profile/[username]`.
- `Reveal.tsx` — client wrapper for server pages: batch-staggers every `[data-reveal]` descendant via `ScrollTrigger.batch` (start "top 88%", `once`, initial dim 0.25 → rise). Used by statement, profile, leaderboard, rules, about, archive.
- `Skeleton.tsx` — loading-state building block.
- `Pagination.tsx` — reusable pager (props: `page`, `totalPages`, `totalItems`, `itemLabel`, `hrefFor(page)`). Hairline-topped readout row + windowed zero-padded page cells (first/last/current ±1, inert `…` gaps), chip-style active state, disabled edge Prev/Next. Renders `null` at ≤1 page. Used by `/domain`; drop-in for future paginated pages.

**Shared pieces:** `ArenaCard` (one base for trending/newest/archive cards; has `data-reveal` + GSAP hover lift built in), `ScoreBar` (+ `useScoreBarReveal` hook — bars draw from outer edges), `CaseColumn side="for"|"against"` (single implementation, literal class strings per side for Tailwind), `SearchBar` (debounced modal, dialog semantics, Escape/backdrop close, open-only GSAP choreography).

**Utils:** `_utils/gsap.ts` (see §6), `_utils/logicScore.ts` (`convertLogicScore`: score → tier beginner…master / grade B…M — used by comment cards and leaderboard), `_utils/timeAgo.ts`, `_utils/getUser.ts`, `_hooks/useUser.ts`, `_hooks/useScoreBarReveal.ts`.

## 4a. Statement posting flow (`_components/statement/`, redesigned 2026-07-17)

One evolving surface driven by a state machine in `StatementForm.tsx` (container — TAB indentation inside function bodies): `compose → checking → verdict(pass|fail|unavailable) → casting → redirect`. Editing text or switching domain voids the verdict with a notice.

| Component | Responsibility |
|---|---|
| `StatementForm.tsx` | State machine, API calls (30s check / 60s cast axios timeouts), draft persistence (`localStorage` `crux:statement-draft`, restore deferred via `setTimeout(0)` for StrictMode + the `react-hooks/set-state-in-effect` rule), Cmd/Ctrl+Enter, login gate, avatar fetch via `/user/me` (JWT carries no avatar) |
| `StageRail.tsx` | `01 COMPOSE ── 02 VERDICT ── 03 BROADCAST` progress rail (CSS transitions, derived from state) |
| `DomainPicker.tsx` | Domain chips + **AUTO** chip (default; tertiary accent; sentinel `AUTO_DOMAIN = "auto"` in `app/statement/types.ts`); mobile = two-row horizontal scroll strip |
| `ClaimEditor.tsx` | Textarea; exports `MIN_CHARS`/`MAX_CHARS`/`isTextInLimits`; countdown counter (tertiary ≥105, secondary at 120, "SUBSTANCE CONFIRMED" once armed); free local nudges (trailing `?`, hedge words) |
| `VerdictPanel.tsx` | Verdict-colored panel (PASS cyan+glow / FAIL red+glow / UNAVAILABLE amber no-glow); ORIGINAL-vs-IMPROVED radio-cards (improved pre-selected, skipped when identical); `REFILED: X → Y` notice, or `FILED UNDER: Y` when AUTO; fail "Try the Arbiter's reframe"; similar-fights links (`GET /search` by keyword, capped 3, silent failure, `similarSeq` staleness guard in container) |
| `BroadcastPreview.tsx` | ArenaCard-style preview (keyword highlight with graceful fallback, real user avatar); progress-theater button (4 staged labels @2.2s); logged-out → `Log in to broadcast` link |

Flow guarantees: logged-out users compose and check freely ("SPECTATOR MODE" banner); drafts survive reload and the login round-trip (`/login?next=/statement`); broadcast success clears the draft and redirects to the new `/argument/CRX-{id}-A`; failure preserves all state with retry in place; double-submit guarded (`casting` set before the `getUser()` await).

## 5. Assets & metadata

- File-convention assets (generated, brand-styled): `app/icon.png` (favicon), `app/apple-icon.png`, `app/opengraph-image.png` (1200×630 "Cru*x*" card). `public/register-hero.png` = local duotone quote-marks hero, served via `next/image` (`fill` + `sizes` + `priority`). **Zero raw `<img>` tags and zero hotlinked assets in the app.**
- Metadata: root title `"Crux — The Digital Debate Arena"` with `%s · Crux` template; every top-level page exports its own `metadata.title`.
- Assets were generated by screenshotting hand-built HTML in Playwright with the real brand fonts — repeatable technique if new marks are needed.

## 6. Motion system (GSAP)

**The pattern (mandatory for all decorative motion):**
```ts
import { gsap, useGSAP, MOTION_OK } from "@/app/_utils/gsap";
useGSAP(() => {
  const mm = gsap.matchMedia();
  mm.add(MOTION_OK, () => { /* tweens; end state = server-rendered state */ });
}, { scope: ref });
```
Reduced-motion users get the server-rendered end state (verified via emulation). Entrances start elements **dimmed (opacity 0.25), never hidden**, and `clearProps` on complete. One-off event tweens (like pop, hover lift) guard with `window.matchMedia(MOTION_OK).matches`.

**What animates today:** home feed + sidebar stagger, tab-switch crossfade (`ActiveArguments`, skips first mount), argument hero (SplitText lines + bar draw + % count-up), case columns slide from their own sides (`data-case`, once), like-button pop, `ArenaCard` hover lift (−6px, `overwrite:"auto"`), search modal open (backdrop fade + panel scale, **never per keystroke**), auth entrance timelines (login card rise; register form/fields/panel), profile chart bars grow from baseline, `Reveal` staggers on all §4 pages. Existing `animate-pulse`/`animate-ping` dots carry `motion-reduce:animate-none`.

**Anti-opportunities (still in force):** no per-keystroke result animation; no motion gating form errors or the comment-post loop; no route-exit animations >200ms; no re-tweening bars on data polls; no new infinite loops.

## 7. Backend touchpoints added during the makeover

- `GET /arena/leaderboard` (arena.controller/route) — top-50 standings with `RANK() OVER (ORDER BY logic_score DESC, id ASC)`, statement + comment counts. Read-only.
- `GET /arena/statements` (arena.controller/route) — **the** paginated statement feed, read by `/domain`, `/topic/[keyword]` and the home "Newest" tab: `?domainId=&keyword=&page=&pageSize=` → `{ statements, total, page, pageSize }` (newest-first; rows carry `winner`/`margin` so settled cards can label themselves; `page` clamped to range, `pageSize` default 12 max 50, junk params → defaults). Read-only. It replaced `GET /arena/active/newest`, which was the same query without paging and has been deleted.
- **Avatar system** (avatar.controller/route + `lib/avatars.ts`): `GET /avatar/presets` (public list), `POST /avatar/upload` (auth; multer memory storage 5MB + MIME filter, magic-byte check, sharp → 256×256 webp, metadata stripped), `PUT /avatar/preset` (auth; id validated server-side), `DELETE /avatar` (auth). `backend/public` is served by `express.static`; presets are 18 committed SVGs in `public/avatars/presets`, uploads land in `public/uploads/avatars` (gitignored, `.gitkeep`); replacing/removing deletes the old *custom* file only (ENOENT tolerated), presets are shared and never deleted. Migration `0005_add_user_avatar.sql` added `users.avatar TEXT` storing the public URL path — the prefix distinguishes preset vs custom. `avatar` is returned by `/user/me`, `/profile/:id`, `/comment/:id`, `/arena/leaderboard`, `/arena/sidebar`, and the `/arena/active/*` feeds.
- **Statement-flow backend fixes (2026-07-17):** both AI controllers' `catch` blocks now send real responses (`ai.controller.ts` → `502 {error:"arbiter_unavailable"}`; `argument.controller.ts` → `500`) — previously they sent nothing and the frontend spun forever. `POST /argument` success returns `{ id, message }` (the id drives the post-broadcast redirect). `updateDesciption` is wrapped in its own try/catch so a failed description AI call can't 500 an already-committed insert (which invited duplicate-argument retries). The arbiter prompt gained one `[domain]` rule: hint `"auto"`/empty → pick from the closed list by statement alone.
- **Login `?next=`:** `/login?next=/statement` redirects there after login; validation rejects `//` and `/\` prefixes (open-redirect guard).
- Everything else was frontend-only. Schema: `users(id, role, name, username, logic_score, description, email, avatar)`, `arguments(id, user_id, content, content_keyword, domain, affirmative, negative, created_at)`, `comments(id, user_id, argument_id, side, content, likes)`.

## 8. Known issues & rough edges (candidates for the improvement session)

**Environment**
- **Dev server instability (pre-existing, recurring):** the Next 16.2.7 dev server intermittently spins to ~600% CPU / 3.5GB and stops answering; each incident was preceded by a Turbopack `ChunkLoadError` on the layout chunk. Restart cures it; try clearing `.next` or a Next patch upgrade if it persists after the machine reboot.
- Docker compose still references backend port 4001 while the backend runs on 8000 (port drift, prod config only).

**Product gaps / dead ends**
- "Forgot Password?" (login), "ARENA RULES"/"TERMS" (register), "TERMS"/"CONTACT" (login footer) are `href="#"` — no real destinations yet.
- Footer "Developer terminal" and "Share Crux" buttons are labeled but do nothing.
- Likes: optimistic UI only; unauthenticated likes mutate local state without persisting; no unlike API call.
- Search: no keyboard result navigation (arrow keys), no focus trap in the dialog.
- Leaderboard: no pagination beyond top 50; "Consistency"/"Wins"-style stats from the design mock have no schema backing (page shows only real columns deliberately).
- Leaderboard/home feeds are still unpaginated — `ui/Pagination` + the `/arena/statements` response shape (`{ statements, total, page, pageSize }`) are the intended pattern when they get there.
- Audit motion opportunity #9 (new-comment insertion tween + bar re-tween on post) and #10 (route transitions) were deliberately not built.
- Statement flow, deferred from the 2026-07-17 final review (a11y polish batch): no `aria-live` on the typing nudges, notices, or progress-theater label; the ORIGINAL/IMPROVED radiogroup lacks roving tabIndex/arrow-key nav; `StageRail` has only a static `aria-label` (no `aria-current`).
- `POST /argument` still trusts `user_id` from the client body (no auth middleware) — pre-existing trust model, unchanged by the redesign; server-side derivation is a separate hardening task.
- Hedge-word nudge regexes can false-positive on legitimate phrasing ("this kind of argument") — accepted as a non-blocking heuristic.

**Code quality niggles**
- `React.SubmitEvent` used in auth handlers (non-standard type name; tsc accepts it today).
- `ArgumentInput` posts then `router.refresh()` — no optimistic comment insertion.
- `HighStakesTab` component exists but is unreachable (tab not in `tabList`); `DebateHistory`/`HistoryItem` are dead code.
- Seed data has near-zero logic scores, so leaderboard bars/tiers read flat ("Beginner tier", 0-width bars) — cosmetic until scoring accrues.

## 9. Verification workflow used throughout (repeat it)

1. `cd frontend && npx tsc --noEmit` and `npm run lint` — both must stay at zero.
2. Playwright MCP sweep: navigate `/`, `/login`, `/register`, `/statement`, `/argument/CRX-1-A`, `/profile/me`, `/profile/nitesh_dev`, `/profile/1`, `/profile/nope`, `/leaderboard`, `/rules`, `/about`, `/domain?q=all` collecting console errors + pageerrors — must be zero (ignore one-time `ChunkLoadError` right after a dev-server restart; re-run to confirm).
3. Screenshot desktop (1440) and mobile (390) for visual changes; check `scrollWidth === clientWidth` at 390px.
4. For motion work: emulate `prefers-reduced-motion: reduce` and assert no element is left dimmed/transformed; assert end states are `opacity: 1` / `transform: none`.
5. Backend endpoint changes hot-reload via tsx watch; probe with `curl localhost:8000/...`.
