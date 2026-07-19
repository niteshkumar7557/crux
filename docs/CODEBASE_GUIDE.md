# CRUX — Codebase Guide (for a new developer)

You are looking at a mid-sized full-stack app: an AI-refereed debate platform. This
guide is written the way you'd want to receive a large open-source repo — not a feature
list, but a **map + a method** so you can find your way and change things with confidence.

> Product pitch & local setup live in the root [`README.md`](../README.md). The *why*
> behind every mechanic (and what's deferred) lives in [`docs/game-theory.md`](./game-theory.md) —
> start with its **"SHIPPABLE STATUS — through §12"** block. This file is the *how the code works* companion.

---

## 1. How to read this codebase (the method)

Reading a big repo cold, do it in this order — depth-first through **one real path**, not
breadth-first through every folder:

1. **Entry points.** `backend/src/index.ts` (boots the server + two background jobs) and
   `backend/src/app.ts` (mounts every route group). On the frontend, `frontend/app/layout.tsx`
   + `frontend/app/page.tsx` (the home "Arena"). Ten minutes here tells you the shape.
2. **The data model.** Read `backend/src/db/migrations/*.sql` **in numeric order**. They are
   the real spine — every feature added a table or a column, so reading them chronologically
   *is* reading the product's history. (Section 4 below narrates them.)
3. **Trace one request end-to-end.** Pick "post a comment" and follow it: route →
   controller → the AI calls → the SQL writes → the response. Do this once and 80% of the
   codebase's conventions click. (Section 6 walks it for you.)
4. **The background jobs.** Two in-process pollers (`jobs/conclusion.ts`, `jobs/featuring.ts`)
   do everything that isn't request-driven. Read them next.
5. **Then widen out** to the other controllers/components — they all rhyme with what you've
   already seen.

**The single most useful convention to know first:** anything named `*.logic.ts` is **pure,
side-effect-free logic with a `*.logic.test.ts` beside it** (vitest). The messy I/O
(SQL, LLM calls) lives in the sibling non-`.logic` file. So to understand *what a decision
does*, read the `.logic.ts` + its tests; to understand *how it's wired*, read the sibling.

---

## 2. The shape (mental model)

A two-package monorepo, no shared package — they talk over HTTP/JSON.

```
crux/
├── backend/      Node + Express + TypeScript API (raw SQL over Postgres, no ORM)
├── frontend/     Next.js (App Router) + React + Tailwind
├── docs/         game-theory.md (the design bible) + this guide
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
- **The `arguments` table is the heart** — most features bolt a column onto it (see §4).

---

## 3. Run it locally (short version — full setup in the README)

```bash
docker compose -f docker-compose.dev.yml up -d      # Postgres (+ pgAdmin)
cp backend/.env.example backend/.env                # add GROQ_API_KEY (or LLM_API_KEY)
cp frontend/.env.example frontend/.env

cd backend && npm i && npm run db-init && npm run dev    # migrate + seed + start API :8000
cd frontend && npm i && npm run dev                      # Next.js :3000
```

- `npm run db-init` = `db:migrate:dev` + `db:seed:dev` (30 users/statements + comments, all
  passwords `secret`). `db:seed:stress` loads millions of rows for query testing.
- Backend needs an LLM key (default provider Groq; swappable via `LLM_BASE_URL`/`LLM_API_KEY`).
- **In prod, set `NEXT_PUBLIC_SITE_URL`** or share URLs / canonical / OG / sitemap fall back
  to `localhost:3000`.
- Gates before committing: backend `npm test` + `npx tsc --noEmit`; frontend `npm run lint`
  + `npx tsc --noEmit` + `npm test`. Both `npm run build` should pass (they do today).

---

## 4. The data model — read the migrations in order

Postgres, raw SQL, applied by a home-grown runner (`db/migrate.ts`, tracks applied files in a
`_migrations` table, filename-ordered). Reading them top to bottom is reading the product evolve.

| Migration | Adds | What it means |
|---|---|---|
| `0000`–`0001` | `users`, `refresh_tokens` | Identity + JWT refresh. `users.logic_score` = the skill number. |
| `0002` | `arguments` | **The core table.** One row = one *statement* AND its debate arena (`content`, `content_keyword`, `for_analysis`, `against_analysis`, `affirmative`/`negative` probability, `domain_id`). |
| `0003` | `comments` | One contribution to one side (`side` = `'for'`/`'against'`). The atomic unit of debating. |
| `0004`–`0006` | `likes`, `users.avatar`, `domains` | Likes (+2 logic), avatars, the 12 topic domains. |
| `0007` | arguments lifecycle + `debate_results` | **§8 Concluded State.** `arguments` gains `status/closes_at/winner/margin/mvp_user_id/verdict_text`; `debate_results` = per-user W-L outcomes (the `record` economy). |
| `0008` | `debate_results.is_standout`, `arguments.hot_extended` | §8.3 losing-side standout + §8.1 hot-extension flag. |
| `0009` | arguments curation cols | **§9 Main Stage.** `heat`, `featured`, `featured_override`, `is_dotd`, `featured_at`, `dotd_at`. |
| `0010` | arguments `for_low`/`against_low`/`is_upset` | §9.3 upset detection (forecast low-water-mark → "won from behind"). |
| `0011` | `debate_votes` + `arguments.votes` | §9.2 community votes (per-user + denormalized count). |
| `0012` | `notifications` | §10 in-app return triggers. |
| `0013` | `logic_events` | **§12** timestamped logic ledger — makes "logic earned this season" a windowed sum. |

**Takeaway:** `arguments` accreted columns across §8–§10; the *events/relationships* live in
`comments`, `debate_results`, `debate_votes`, `logic_events`, `notifications`. There is no
`seasons` table — seasons are a **pure computed 28-day window** (see §5).

---

## 5. The economy — every number and where it lives

Crux runs on a few numbers. Knowing which is which prevents most confusion:

| Number | Meaning | Source of truth | Code |
|---|---|---|---|
| **`logic_score`** | all-time **skill** (monotonic) | `users.logic_score` | awarded via `economy/logic.ts` `awardLogic()` |
| **`logic_events`** | ledger of every logic change (for seasonal windowing) | `logic_events` table | written by the same `awardLogic()` |
| **`record` (W-L)** | all-time **standing** | `debate_results` rows | written by `ai/verdict.ts` at conclusion |
| **Season logic / LP / division** | this-season slice + ladder | *computed*, no table | `economy/season.logic.ts` (pure) |
| **`heat` / `votes`** | stage-ranking inputs | `arguments.heat`/`.votes` | `jobs/featuring.ts` + `jobs/featuring.logic.ts` |

`awardLogic(db, userId, amount, reason)` is the **one place** that touches `logic_score` — it
updates the score *and* inserts a ledger row together, so the all-time total and the seasonal
window can never drift. Every award site (comment, like, verdict payouts, abuse penalty) routes
through it.

---

## 6. The AI personas & the core flows

### The five LLM "personas"
All go through `ai/llm.ts` (`llmJson()` → an OpenAI-compatible `/chat/completions` endpoint,
default Groq; `smart` vs `fast` model, swappable via env). Each persona is a system prompt:

1. **Arbiter** — gates a new statement (pass/fail + rewrite). `controllers/argument.controller.ts`.
2. **Opening Analyst** — writes the initial For/Against cases. `argument.controller.ts`.
3. **Moderator/Analyst** — per comment: screens abuse, scores 1–8 by *thread-relative* value,
   rewrites that side's running analysis. `controllers/comment.controller.ts` (prompt built by
   pure `ai/analyst.logic.ts`).
4. **Probability judge** — recomputes the live win split once both sides have a comment.
   `comment.controller.ts`.
5. **Verdict Judge** — at close: winner + margin + MVP + standout + closing paragraph.
   `ai/verdict.ts` (decisions in pure `ai/verdict.logic.ts`).

### Flow A — post a statement
`POST /argument` → `argument.controller.ts`: **Arbiter** gate (fail → reason + rewrite) →
on pass, insert the `arguments` row + **Opening Analyst** writes both cases + `closes_at` set.
The arena is now live.

### Flow B — post a comment (the flow to trace first)
`POST /comment/:side/:id` → `comment.controller.ts` `postComment()`:
1. **Side-lock** — your first comment locks your side (409 if you try the other side).
2. Pre-insert **side counts** (drive the opener exception + the §9.3 underdog multiplier).
3. **Moderator/Analyst** LLM: `{ abused, points, newAnalysis }` (abuse → −4 logic, return).
4. Insert the comment; award = `points` → clamp 1–8 → `applyRepeatDecay` (§8.5) →
   `applyUnderdogMultiplier` (§9.3) → `awardLogic(...)` (score + ledger).
5. Rewrite that side's `*_analysis`; **Probability judge** updates `affirmative/negative` and
   the `for_low`/`against_low` low-water-marks (§9.3 upset tracking).
6. Best-effort **notify** the opposing side + author if this is a new participant (§10).

### Flow C — conclusion (background)
`jobs/conclusion.ts` polls every **60s**: any `live` argument past `closes_at` → `ai/verdict.ts`
`concludeDebate()` (one DB transaction): fetch comments/participants → **Verdict Judge** →
`resolveVerdict`/`resolveStandout`/`resolvePayouts` (pure) → write `debate_results` + apply
logic payouts via `awardLogic` + set `winner/margin/mvp/is_upset` on `arguments` → commit →
best-effort verdict **notifications**. (Same tick first runs the §8.1 hot-extension pass.)

### The other job — featuring (the "Main Stage")
`jobs/featuring.ts` polls every **5 min**: recompute `heat` (velocity × balance, `featuring.logic.ts`)
→ refresh the `featured` set by `heat + VOTE_WEIGHT*votes` → crown one **Debate of the Day** per
calendar day. Booted in `index.ts` alongside the conclusion poller.

---

## 7. The frontend (Next.js App Router)

- **Server components by default** fetch via `axios.server.ts` (`serverApi`, SSR/build-time).
  **Client components** (`"use client"`) fetch via `axios.ts` (`api`, attaches the JWT from
  `localStorage`, base `/api`). Knowing which axios you're in explains most data-flow questions.
- **Routes** (`frontend/app/*`): `/` (Arena home), `/argument/[id]` and the canonical SEO alias
  `/debate/[slug]` (both render the shared `_components/argument/DebateView.tsx`), `/domain`,
  `/topic/[keyword]` (SEO hubs), `/leaderboard` (Season + Legends boards), `/profile/[id]`,
  `/statement`, `(auth)/login|register`, plus `sitemap.ts` + `robots.ts`.
- **Component folders** under `_components/`: `arena/` (feed cards, Main Stage, VoteButton),
  `argument/` (the debate page pieces: header, arena columns, input, verdict banner, OG card),
  `profile/`, `statement/`, `ui/` (primitives). `Navbar.tsx` hosts the `NotificationBell`.
- **`_utils/`** holds pure helpers (`slugify`, `debateMeta`, `timeAgo`, `logicScore`, gsap setup).

---

## 8. "If you want to change X, look at Y"

| Task | Start here |
|---|---|
| Change how comments are scored | `ai/analyst.logic.ts` (+ its test) then `comment.controller.ts` |
| Change the verdict / payouts | `ai/verdict.logic.ts` (+ test) then `ai/verdict.ts` |
| Change what's featured / DotD | `jobs/featuring.logic.ts` + `jobs/featuring.ts` |
| Change season/LP/divisions | `economy/season.logic.ts` (+ test) |
| Add an API endpoint | a `routes/*.route.ts` + a `controllers/*.controller.ts`, mount in `app.ts` |
| Add a DB column/table | new `db/migrations/00NN_*.sql`, `npm run db:migrate:dev` |
| Swap the LLM provider | env only (`LLM_BASE_URL`/`LLM_API_KEY`/`LLM_MODEL_*`) — no code change |
| Change the debate page UI | `_components/argument/DebateView.tsx` + its children |
| Add a notification type | `notifications/messages.ts` + `notifications/notify.ts` + a hook |

---

## 9. Gotchas & things that will surprise you

- **ESM `.js` imports** in backend `.ts` files are intentional — don't "fix" them.
- **No ORM** — all SQL is inline in controllers; grep the table name to find every touch point.
- **Two pollers, in-process** (no external queue/cron) — they run inside the API process,
  each guarded against overlap; a `setInterval` is the whole scheduler.
- **`docs/superpowers/` is git-ignored** — the per-feature specs/plans there are local working
  notes, not part of the repo. The committed design record is `docs/game-theory.md`.
- **Known bug (flagged, unfixed):** `postComment` has no wrapping transaction, so if the 2nd
  LLM call (probability) rate-limits, the comment + logic award persist but the client gets a
  500. Wrapping the writes in `BEGIN/COMMIT` is the fix.
- **What's NOT built:** the whole **§13 live video arena**, plus deferred pieces (rounds/rematch,
  season-rollover job, email/digest, Hall of Fame, cosmetics, governance vote-weight). The
  authoritative built-vs-deferred list is the **"SHIPPABLE STATUS"** block in `docs/game-theory.md`.

---

## 10. A suggested first afternoon

1. Read this file + the "SHIPPABLE STATUS" block in `game-theory.md` (20 min).
2. Read the migrations `0000`→`0013` in order (30 min) — you now know the data model.
3. Read `index.ts`, `app.ts`, then `comment.controller.ts` top to bottom, opening
   `analyst.logic.ts` when it's referenced (45 min) — you now know one full flow + the
   pure-logic convention.
4. Read `jobs/conclusion.ts` + `ai/verdict.ts` + `verdict.logic.ts` (30 min) — you now know how
   debates end and the economy pays out.
5. Skim `jobs/featuring.ts` and the frontend `DebateView.tsx` (20 min).

After that, everything else in the repo will look familiar.
