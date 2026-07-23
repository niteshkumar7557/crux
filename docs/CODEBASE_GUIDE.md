# CRUX — Codebase Guide (for a new developer)

You are looking at a mid-sized full-stack app: an AI-refereed debate platform. This
guide is written the way you'd want to receive a large open-source repo — not a feature
list, but a **map + a method** so you can find your way and change things with confidence.

### The four docs, and which one owns what

| File | Owns | Read it when |
|---|---|---|
| [`game-theory.md`](./game-theory.md) | **The spec.** Every rule, every number (§15), and why. | Always first. **If any other doc disagrees with it, it wins.** |
| **`CODEBASE_GUIDE.md`** (this file) | How the code is organised and how a request flows. | Before changing backend code or tracing a flow. |
| [`frontend-audit.md`](./frontend-audit.md) | The frontend **design system** — tokens, motion, component conventions, working rules. | Before changing UI. It predates the v1 restructure, so it does not own game rules. |
| [`future-features.md`](./future-features.md) | Designed-and-deferred features. | Before "adding" something — it may already have a shape. |

Product pitch & local setup live in the root [`README.md`](../README.md).

---

## 1. How to read this codebase (the method)

Reading a big repo cold, do it in this order — depth-first through **one real path**, not
breadth-first through every folder:

1. **Entry points.** `backend/src/index.ts` (boots the server + three background jobs) and
   `backend/src/app.ts` (mounts every route group). On the frontend, `frontend/app/layout.tsx`
   + `frontend/app/page.tsx` (the home "Arena"). Ten minutes here tells you the shape.
2. **The data model.** Read `backend/src/db/migrations/*.sql` **in numeric order** — eleven files,
   and together they are the whole schema. (Section 4 narrates them.)
3. **Trace one request end-to-end.** Pick "post a comment" and follow it: route →
   controller → the AI calls → the SQL writes → the response. Do this once and 80% of the
   codebase's conventions click. (Section 6 walks it for you.)
4. **The background jobs.** Three in-process pollers (`jobs/conclusion.ts`, `jobs/featuring.ts`,
   `jobs/seasonRollover.ts`) do everything that isn't request-driven. Read them next.
5. **Then widen out** to the other controllers/components — they all rhyme with what you've
   already seen.

**The single most useful convention to know first:** anything named `*.logic.ts` is **pure,
side-effect-free logic with a `*.logic.test.ts` beside it** (vitest). The messy I/O
(SQL, LLM calls) lives in the sibling non-`.logic` file. So to understand *what a decision
does*, read the `.logic.ts` + its tests; to understand *how it's wired*, read the sibling.

There are five of them, and between them they hold every rule in the game:

| Pure module | Owns |
|---|---|
| `ai/analyst.logic.ts` | comment scoring — the 1–8 clamp, the standalone cap, the halving |
| `ai/verdict.logic.ts` | the draw threshold, MVP validation, every payout |
| `economy/season.logic.ts` | calendar-month season windows |
| `jobs/featuring.logic.ts` | `heat` = velocity × side balance, the Main Stage size |
| `jobs/seasonRollover.logic.ts` | which three users win a finished season, and when there isn't one |

The frontend has the same convention without the `.logic` infix:
`_components/argument/verdictCard.ts` and `_components/ui/awardCopy.ts` are pure + tested.

---

## 2. The shape (mental model)

A two-package monorepo, no shared package — they talk over HTTP/JSON.

```
crux/
├── backend/      Node + Express + TypeScript API (raw SQL over Postgres, no ORM)
├── frontend/     Next.js (App Router) + React + Tailwind
├── docs/         game-theory.md (the spec) + future-features.md + this guide
└── docker-compose.dev.yml   local Postgres + pgAdmin
```

**Backend stack:** Express, `pg` (hand-written SQL — there is **no ORM**), JWT auth
(`bcrypt` + `jsonwebtoken` + `cookie-parser`), `helmet`/`cors`, `multer`+`sharp` (avatar
uploads), `tsx` (dev/run), `vitest` (tests). LLM calls go through one thin `fetch` client.

**Frontend stack:** Next.js App Router (React Server Components by default), Tailwind, GSAP
(animation), `axios` (two instances — see §7), `react-icons/lu` (Lucide), `react-markdown`.

**Conventions that repeat everywhere:**
- **ESM with `.js` import specifiers** in backend TS (`import x from "./y.js"` even though the
  file is `y.ts`) — required by the Node ESM + TS setup. Match it.
- **Controllers hold the SQL.** Routes are one-liners; controllers do request parsing +
  queries + response. There is no repository/service layer except the small pure modules.
- **Pure logic + vitest** (`*.logic.ts`), everything else eval-verified against the dev DB.
- **The `arguments` table is the heart** — one row is a statement *and* its debate.

---

## 3. Run it locally (short version — full setup in the README)

```bash
docker compose -f docker-compose.dev.yml up -d      # Postgres (+ pgAdmin)
cp backend/.env.example backend/.env                # add GROQ_API_KEY (or LLM_API_KEY)
cp frontend/.env.example frontend/.env

cd backend && npm i && npm run db-init && npm run dev    # migrate + seed + start API :8000
cd frontend && npm i && npm run dev                      # Next.js :3000
```

- **`backend/.env.example` is the complete list of knobs**, grouped and commented, and
  `src/config/index.ts` is the only place the app reads `process.env`. Add a setting by
  putting it in both — never `process.env.X` at a call site. Two documented exceptions:
  `economy/season.logic.ts` reads `CRUX_SEASON_ZERO` itself (it is a pure module and must not
  import config, which would drag `dotenv/config` into its unit tests), and `db/seed-stress.ts`
  reads its own `SEED_*` vars because it is a standalone dev script.
- **Game rules are not configuration.** The §15 constants live in the four `*.logic.ts`
  modules, are asserted by unit tests, and are printed to users on `/rules` — an env override
  would make the UI lie. Change the spec, the code, the test, and the copy together.
- `npm run db-init` = `db:migrate:dev` + `db:seed:dev` (30 users/statements + comments, all
  passwords `secret`). `db:seed:stress` loads millions of rows for query testing.
- **To change an existing migration, edit it in place and reset** — `migrate.ts` records each
  filename in a `_migrations` table and skips anything already there, so an edit is invisible
  to a database that already ran it. The full cycle is
  `npm run db:reset:dev && npm run db-init`. `db:reset:dev` drops and recreates the public
  schema and refuses to run under `NODE_ENV=production`.
- Backend needs an LLM key (default provider Groq; swappable via `LLM_BASE_URL`/`LLM_API_KEY`).
  **Groq's free tier caps at 8000 tokens/minute** and one comment costs two calls, so
  hand-testing posts back to back returns `429`. Space them ~30s apart.
- **Set `CRUX_SEASON_ZERO=YYYY-MM`** to the real launch month. Season numbers are derived from
  it, so before that month the UI reads "Season -1" and the rollover job correctly awards
  nothing (see §5).
- **In prod, set `NEXT_PUBLIC_SITE_URL`** or share URLs / canonical / OG / sitemap fall back
  to `localhost:3000`.
- Gates before committing — all six must pass:
  ```bash
  cd backend  && npm test && npx tsc --noEmit && npm run build
  cd frontend && npm test && npm run lint && npx tsc --noEmit && npm run build
  ```

---

## 4. The data model — eleven migrations, one schema

Postgres, raw SQL, applied by a home-grown runner (`db/migrate.ts`, tracks applied files in a
`_migrations` table, filename-ordered). These eleven files *are* the schema — read them in order
and you have the whole data model.

| Migration | Table | What it means |
|---|---|---|
| `0000` | `users` | Identity. `logic_score` = the all-time skill number; `role` (`'user'`/`'admin'`) is carried in the JWT and guarded by `requireRole`. |
| `0001` | `refresh_tokens` | JWT refresh. |
| `0002` | `domains` | The 12 topic domains. |
| `0003` | `arguments` | **The core table.** One row = one *statement* AND its debate: the claim, both AI-written cases, the live `affirmative`/`negative` split, the lifecycle (`status`, `closes_at`, `winner`, `margin`, `mvp_user_id`, `verdict_text`), and the stage (`heat`, `featured`, `pinned`, `is_dotd`, `featured_at`, `dotd_at`). |
| `0004` | `comments` | One contribution to one side. `reply_to_comment_id` is the §5 cross-side reply link (`NULL` = standalone); `points` is what the comment earned. |
| `0005` | `likes` | +2 logic to the comment's author. |
| `0006` | `debate_results` | Per-user W/L/D outcome per concluded debate — the permanent record. |
| `0007` | `season_awards` | §10 season titles. Permanent, stacking, status-only. `UNIQUE (season_key, rank)` is what makes the rollover job idempotent. |
| `0008` | `notifications` | In-app return triggers (`opposition`, `reply`, `verdict`, `season`). |
| `0009` | `logic_events` | The timestamped logic ledger. `season_only = TRUE` writes a ledger row **without** touching `logic_score` — that is how a loss costs the month's race and never the career total. |
| `0010` | *(indexes only)* | Indexes the profile filters on: `comments(user_id)`, `arguments(user_id)`, `users(logic_score DESC, id ASC)`. Postgres does not auto-index foreign keys, and every profile query filters on those columns. |

**Two things to internalise:** there is no `seasons` table (a season is a **computed calendar
month**, §5), and `arguments.pinned` is the admin override — not a separate curation table.

---

## 5. The economy — every number and where it lives

| Number | Meaning | Source of truth | Code |
|---|---|---|---|
| **`logic_score`** | all-time **skill**, monotonic — never falls | `users.logic_score` | `economy/logic.ts` `awardLogic()` |
| **`logic_events`** | ledger of every logic change, for seasonal windowing | `logic_events` table | the same `awardLogic()` |
| **season logic** | logic earned *this calendar month* | *computed* — a windowed `SUM(amount)` | `economy/season.logic.ts` (pure) |
| **`record` (W–L–D)** | all-time standing | `debate_results` rows | written by `ai/verdict.ts` at conclusion |
| **season titles** | the only thing that survives a season | `season_awards` rows | `jobs/seasonRollover.ts` |
| **`heat`** | stage ranking — velocity × side balance | `arguments.heat` | `jobs/featuring.ts` + `.logic.ts` |

`awardLogic(db, userId, amount, reason, seasonOnly = false)` is the **one place** that touches
`logic_score` — it updates the score *and* inserts a ledger row together, so the all-time total
and the seasonal window can never drift. Every award site (comment, like, verdict payouts,
abuse penalty) routes through it.

**The `seasonOnly` flag is the whole trick.** `awardLogic(..., true)` writes the ledger row and
skips the `logic_score` update. That is the −5 loss penalty: it drags your season board position
down and leaves your career total untouched. One number, two readings.

**Seasons are pure arithmetic, not rows.** `season.logic.ts` derives the current month's window
from `Date` alone; `SEASON_ZERO` comes from `CRUX_SEASON_ZERO` (default `2026-08`). Season
numbers before that month are **negative**, which is arithmetically right and looks wrong in the
UI — set the env var. `seasonRollover.logic.ts` `previousSeason()` returns `null` below Season 0
so a pre-launch month can never be awarded.

---

## 6. The AI personas & the core flows

### The five LLM "personas"
All go through `ai/llm.ts` (`llmJson()` → an OpenAI-compatible `/chat/completions` endpoint,
default Groq; `smart` vs `fast` model, swappable via env). Each persona is a system prompt:

1. **Arbiter** — gates a new statement (pass/fail + reason + a sharper rewrite + keyword +
   domain). `controllers/ai.controller.ts` (`POST /ai/statement`, body field **`content`**).
2. **Opening Analyst** — writes the initial For/Against cases. `argument.controller.ts`.
3. **Moderator/Analyst** — per comment: screens abuse, scores 1–8, rewrites that side's running
   case. `controllers/comment.controller.ts`; the prompt is built by pure `ai/analyst.logic.ts`.
   **When the comment is a reply it is additionally shown the exact comment being answered** —
   that difference in what the model sees is precisely why replies are worth more.
4. **Probability judge** — recomputes the live win split once both sides have argued.
   `comment.controller.ts`.
5. **Verdict Judge** — at close: the two percentages, winner, MVP, and the closing paragraph.
   `ai/verdict.ts` (decisions in pure `ai/verdict.logic.ts`).

### Flow A — post a statement
`POST /ai/statement` runs the **Arbiter** gate on its own (fail → reason + rewrite, shown in the
composer). On pass, `POST /argument` inserts the row, the **Opening Analyst** writes both cases,
and `closes_at` is set to +48h. The arena is live.

### Flow B — post a comment (the flow to trace first)
`POST /comment/:side/:id` → `comment.controller.ts` `postComment()`:
1. **Validate the reply target** if `replyToCommentId` is set — it must exist, belong to this
   debate, and be on the **opposite** side (409 `bad_reply_target`). Cross-side-only is a rule,
   so it is enforced server-side, not just hidden in the UI.
2. **Side lock** — your first comment locks your side (409 `side_locked` on the other one). For
   a reply the side is *derived* from the target, not trusted from the URL.
3. Pre-insert **side counts** and this user's **prior comment count** in this debate.
4. **Moderator/Analyst** LLM: `{ abused, points, newAnalysis }` (abuse → −4 logic, return).
5. `scoreComment()` (pure): clamp 1–8 → cap a standalone at 5 (exempt while the opposing side is
   empty) → halve past 3 comments. Insert the comment with its `points`, then `awardLogic`.
6. Rewrite that side's case; **Probability judge** updates `affirmative`/`negative`.
7. Best-effort **notify**: the replied-to author, and the opposing side on a new participant.
8. Respond with the full score breakdown — `{ points, judged, capped, halved, isReply,
   replyToUsername, seasonLogic, seasonRank }` — which is exactly what the points pop-up renders.

### Flow C — conclusion (background, 60s)
`jobs/conclusion.ts` → any `live` argument past `closes_at` → `ai/verdict.ts` `concludeDebate()`
in one transaction: fetch comments/participants → **Verdict Judge** → `resolveVerdict` +
`resolvePayouts` (pure) → write `debate_results`, apply payouts via `awardLogic` (losses with
`seasonOnly = true`), set `winner`/`margin`/`mvp_user_id`/`verdict_text` → commit → best-effort
notifications. A side with **zero** comments short-circuits to `walkoverPayout()`: nobody scores,
the author included.

### Flow D — the stage (background, 5 min)
`jobs/featuring.ts`, in this order: recompute `heat` for every live debate (one set-based UPDATE
mirroring `computeHeat`) → **crown the Debate of the Day** if none is held for the current UTC
day → refresh the featured set = the DotD + the top `MAIN_STAGE_SIZE` by heat + every admin pin.
Order matters: the DotD is picked by heat and then force-featured, because the home hero queries
`featured = TRUE AND is_dotd = TRUE`.

### Flow E — season rollover (background, 1 hour)
`jobs/seasonRollover.ts`: if the previous calendar month is Season 0 or later and has no awards
on file, snapshot its final board and write the top three a permanent title + frame, then notify
them. Idempotent twice over — the already-filed check and `UNIQUE (season_key, rank)`.

---

## 6a. Changing a §15 constant — the checklist

`docs/game-theory.md` §15 is the table of every tunable number in the game. Each one is
**deliberately not an env var** (see §3): it is asserted by a unit test and, in most cases,
printed to users as prose. So changing one is a small edit in four or five places at once, and
missing the copy is how the product ends up lying to its users.

**The rule of thumb, in order, every time:**

1. **`docs/game-theory.md`** — §15's table *and* the prose section that explains it (§3/§6/§7/
   §8/§9/§10/§11). The spec is the source of truth; change it first.
2. **The constant** in its `*.logic.ts` module.
3. **Its unit test** — several assert the literal value (`expect(DRAW_MARGIN).toBe(5)`), so a
   changed constant *fails the suite by design*. That failure is the reminder, not a bug.
4. **Every UI surface that states the number** — §14 requires these, and none of them is
   computed from the constant unless the table below says so.
5. **Any LLM prompt that encodes it** — the model is told the score bands in prose.

### Where each constant actually lives

| §15 constant | Value | Source of truth | Also change |
|---|---|---|---|
| **Debate duration** | 48h | *no constant* — `INTERVAL '48 hours'` inline in `controllers/argument.controller.ts` (insert) | `db/seed-data.ts` (same literal); `/rules` rule 1 copy. Consider extracting to a constant first. |
| **Draw threshold** | 5 | `ai/verdict.logic.ts` `DRAW_MARGIN` | `verdict.logic.test.ts`; **`_components/argument/ArgumentProbability.tsx` has its own `DRAW_MARGIN = 5`** and derives the draw band from it; `/rules` rule 5; `VerdictBanner.tsx` payout copy |
| **Score range** | 1–8 | `ai/analyst.logic.ts` `SCORE_MIN`/`SCORE_MAX` | `analyst.logic.test.ts`; the **analyst prompt** in `comment.controller.ts` (band descriptions `7-8`/`5-6`/`3-4`/`1-2` and `6-8`/`4-5`/`1-3`); `/rules` rule 3 |
| **Standalone cap** | 5 | `ai/analyst.logic.ts` `STANDALONE_CAP` | `analyst.logic.test.ts`; **`_components/ui/awardCopy.ts` has its own `STANDALONE_CAP = 5`** + `awardCopy.test.ts`; the composer hint in `ArgumentInput.tsx`; `/rules` rule 3 |
| **Full-value comments** | 3 | `ai/analyst.logic.ts` `FULL_VALUE_COMMENTS` | `analyst.logic.test.ts`; **`ArgumentInput.tsx` has its own `FULL_VALUE_COMMENTS = 3`** for the counter; `awardCopy.ts` halving line; `/rules` rule 4 |
| **Halving floor** | 1 | inline `Math.max(1, …)` in `analyst.logic.ts` `scoreComment` | `analyst.logic.test.ts` ("never halves below 1"); `/rules` rule 4 |
| **Like bonus** | +2 | *no constant* — inline in `controllers/like.controller.ts` | nothing states it in the UI today |
| **Abuse penalty** | −4 | *no constant* — inline in `controllers/comment.controller.ts` | the composer fine print in `ArgumentInput.tsx` ("costs 4 logic") |
| **MVP bonus** | +25 | `ai/verdict.logic.ts` `MVP_BONUS` | `verdict.logic.test.ts`; `VerdictBanner.tsx`; `/rules` rule 6 |
| **Win bonus** | +10 | `ai/verdict.logic.ts` `WIN_BONUS` | `verdict.logic.test.ts`; `VerdictBanner.tsx`; `/rules` rule 6 |
| **Loss penalty** | −5 season-only | `ai/verdict.logic.ts` `LOSS_PENALTY` | `verdict.logic.test.ts`; `VerdictBanner.tsx`; **`SideLockConfirm.tsx`** (§14 needs it before *and* after); `/rules` rule 6 |
| **Author bonus** | +5 | `ai/verdict.logic.ts` `AUTHOR_BONUS` | `verdict.logic.test.ts`; `VerdictBanner.tsx`; `StatementForm.tsx`; `/rules` rule 6 |
| **Walkover payout** | 0 | `ai/verdict.logic.ts` `walkoverPayout()` | `verdict.logic.test.ts`; the walkover banner in `DebateView.tsx`; `VerdictBanner.tsx`; `StatementForm.tsx`; `/rules` rule 6 |
| **Season length** | 1 calendar month | `economy/season.logic.ts` (the whole module) | `season.logic.test.ts`; the leaderboard strip and profile season card |
| **Season awards** | top 3 | `jobs/seasonRollover.logic.ts` `TITLES` / `FRAMES` | `seasonRollover.logic.test.ts`; `_components/profile/SeasonTitles.tsx` (`FRAME_BADGE`/`FRAME_RING` maps must gain a key per new frame); the leaderboard prize line |
| **Main Stage size** | ~4 | `jobs/featuring.logic.ts` `MAIN_STAGE_SIZE` | `featuring.logic.test.ts`. Note `getSecondaryCardsData` in `arena.controller.ts` has its own `LIMIT 6` — raise it or the extra cards never render |
| **Debate of the Day** | 1/day | `jobs/featuring.ts` `rotateDotd()` (the UTC-day guard) | nothing else; `getPrimaryCardData` assumes exactly one |
| **Tier thresholds** | 0/50/100/150/200 | `controllers/profile.controller.ts` `convertLogicScore()` | **`frontend/app/_utils/logicScore.ts` is a full duplicate of the same ladder** — change both or the profile and the cards disagree |
| **Username rule** | `^[a-z0-9_]{3,20}$` | `lib/username.logic.ts` | `username.logic.test.ts`; **`frontend/app/_utils/username.ts` is a full duplicate**; the register form's hint copy |

### The five values that exist in two places

These are duplicated across the backend/frontend boundary on purpose — the frontend cannot
import backend modules — and they are the ones that silently drift:

- `DRAW_MARGIN` → `ai/verdict.logic.ts` **and** `ArgumentProbability.tsx`
- `STANDALONE_CAP` → `ai/analyst.logic.ts` **and** `ui/awardCopy.ts`
- `FULL_VALUE_COMMENTS` → `ai/analyst.logic.ts` **and** `ArgumentInput.tsx`
- the tier ladder → `profile.controller.ts` **and** `_utils/logicScore.ts`
- the username rule → `lib/username.logic.ts` **and** `app/_utils/username.ts`

A drift here is invisible to both test suites — each side stays internally consistent while the
UI states a different rule than the server enforces. Grep the number across both packages
before you call the change done:

```bash
grep -rn "<the old value>" backend/src frontend/app --include="*.ts" --include="*.tsx"
```

### Finally

Run all six gates. A red `*.logic.test.ts` after a deliberate change means step 3 — update the
assertion to the new value; it is doing its job. Then re-read `/rules` in a browser and confirm
the page and the code now say the same thing.

---

## 7. The frontend (Next.js App Router)

- **Server components by default** fetch via `axios.server.ts` (`serverApi`, SSR/build-time).
  **Client components** (`"use client"`) fetch via `axios.ts` (`api`, attaches the JWT from
  `localStorage`, base `/api`). Knowing which axios you're in explains most data-flow questions.
- **Routes** (`frontend/app/*`): `/` (Arena home), `/argument/[id]` and the canonical SEO alias
  `/debate/[slug]` (both render the shared `_components/argument/DebateView.tsx`), `/domain`,
  `/topic/[keyword]` (SEO hubs), `/leaderboard` (Season + Legends boards), `/profile/me`
  (client shim → canonical URL) and `/profile/[username]` (numeric segments redirect),
  `/statement`, `/rules`, `(auth)/login|register`, plus `sitemap.ts` + `robots.ts`.
- **Component folders** under `_components/`: `arena/` (feed cards, Main Stage, `PinControl`),
  `argument/` (the debate page: header, arena columns, composer, reply context, side-lock
  confirmation, verdict banner, OG card), `profile/`, `statement/`, `ui/` (primitives +
  `PointsPopup`). `Navbar.tsx` hosts the `NotificationBell`.
- **`_utils/`** holds pure helpers (`slugify`, `debateMeta`, `timeAgo`, `logicScore`, gsap setup).
- **The transparency layer is a product requirement, not polish.** §14 of the spec lists every
  rule that must be visible *before* it can bite. In the code that means: the side-lock
  confirmation before a first comment, the "arguing FOR" badge and comment counter on the
  composer, the points pop-up after posting, the draw band on the probability bar, the walkover
  banner, and the payout breakdown on the verdict card. **If you add a rule that changes a
  user's outcome, you owe it a surface.**
- **Tailwind cannot see class names built at runtime.** Colour-by-variant (award frames, verdict
  rulings, side colours) always goes through a lookup of literal class strings.

---

## 8. "If you want to change X, look at Y"

| Task | Start here |
|---|---|
| Change how comments are scored | `ai/analyst.logic.ts` (+ its test) then `comment.controller.ts` |
| Change the verdict / payouts | `ai/verdict.logic.ts` (+ test) then `ai/verdict.ts` |
| Change what's featured / DotD | `jobs/featuring.logic.ts` + `jobs/featuring.ts` |
| Change the season window or numbering | `economy/season.logic.ts` (+ test) |
| Change who wins a season | `jobs/seasonRollover.logic.ts` (+ test) |
| Curate the stage by hand | `controllers/admin.controller.ts` + `_components/arena/PinControl.tsx` |
| Add an API endpoint | a `routes/*.route.ts` + a `controllers/*.controller.ts`, mount in `app.ts` |
| Change the v1 schema | **edit the existing migration in place**, then `db:reset:dev && db-init` |
| Add or change a setting | `src/config/index.ts` **and** `backend/.env.example` — both, always |
| Swap the LLM provider | env only (`LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL_*`) — no code change |
| Retune a poller interval or a limit | env only (`*_TICK_MS`, `*_ROWS`, `VERDICT_MAX_COMMENTS`, …) |
| Change the debate page UI | `_components/argument/DebateView.tsx` + its children |
| Change what a pop-up/banner says | `_components/ui/awardCopy.ts` (+ test) and the §14 surfaces in §7 |
| Add a notification type | `notifications/messages.ts` (+ test) + `notifications/notify.ts` |

---

## 9. Gotchas & things that will surprise you

- **ESM `.js` imports** in backend `.ts` files are intentional — don't "fix" them.
- **No ORM** — all SQL is inline in controllers; grep the table name to find every touch point.
- **Three pollers, in-process** (no external queue/cron) — they run inside the API process,
  each guarded against overlap; a `setInterval` is the whole scheduler. That means **they only
  run where the API runs**: scaling to more than one instance needs a real scheduler first.
- **Editing a migration is invisible without a reset** — see §3. If `db-init` prints
  `⏭ skipping`, your edit did not land.
- **`docs/superpowers/` is git-ignored** — the per-feature specs/plans there are local working
  notes, not part of the repo. The committed design record is `docs/game-theory.md`.
- **`docs/game-theory.md` §15 is the constant table.** If a number is in the code it is in that
  table; change one and you must change both.
- **`docs/future-features.md` is not a wish list** — it is the designed-and-deferred record.
  Check it before "adding" something; it may already have a shape.

### Known gaps, flagged and unfixed

- **`POST /comment/*` is unauthenticated.** `routes/comment.route.ts` mounts both post handlers
  with no `authMiddleware`, and the controller trusts `req.body.userId`. Anyone can post as
  anyone with `curl` and no token. Fixing it changes the frontend contract.
- **`postComment` has no wrapping transaction.** If the second LLM call (probability)
  rate-limits, the comment and the logic award persist but the client gets a 500. Wrapping the
  writes in `BEGIN/COMMIT` is the fix.
- **`POST /ai/statement` does not validate its body.** A missing `content` interpolates the
  string `"undefined"` into the prompt and spends an LLM call judging it.
- **`Countdown` hydrates with a mismatch** on every debate page (`/argument/[id]`,
  `/debate/[slug]`) — the server renders one minute and the client hydrates on the next.
  Harmless, noisy in the console. The profile's **In The Arena** renders the same component but
  does *not* reproduce it: that section is client-fetched, so it never server-renders.
- **Vocabulary is inconsistent.** The spec fixes the two sides as **FOR / AGAINST**, but the
  composer buttons and the probability bar say *Affirmative / Negative*. A rename is a
  product-wide decision, not a local fix.

---

## 10. A suggested first afternoon

1. Read `docs/game-theory.md` end to end (30 min). It is short and it is the spec.
2. Read the migrations `0000`→`0010` in order (20 min) — you now know the data model.
3. Read `index.ts`, `app.ts`, then `comment.controller.ts` top to bottom, opening
   `analyst.logic.ts` when it's referenced (45 min) — you now know one full flow + the
   pure-logic convention.
4. Read `jobs/conclusion.ts` + `ai/verdict.ts` + `verdict.logic.ts` (30 min) — you now know how
   debates end and the economy pays out.
5. Skim `jobs/featuring.ts` and the frontend `DebateView.tsx` (20 min).

After that, everything else in the repo will look familiar.
