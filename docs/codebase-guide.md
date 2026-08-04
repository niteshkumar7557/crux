# Crux — Codebase Guide

You are looking at a mid-sized full-stack app: an AI-refereed debate platform, in production.
This guide is a **map and a method** — enough to find your way and change things with confidence,
not a feature list.

It assumes you are comfortable with TypeScript, React and SQL. It will not explain what a
migration is; it will tell you where ours live and what will bite you.

## The docs, and which one owns what

| File | Owns | Read it when |
|---|---|---|
| [`game-theory.md`](./game-theory.md) | **The spec.** Every rule, every number (§21), and why. | Always first. **If anything else disagrees with it, it wins.** |
| **`codebase-guide.md`** (this file) | How the code is organised and how a request flows. | Before changing anything. |
| [`design-system.md`](./design-system.md) | Colour, type, shape, motion, component conventions. | Before changing UI. It owns no game rules. |
| [`future-features.md`](./future-features.md) | Designed-and-deferred features, and two dead ends. | Before "adding" something — it may already have a shape. |
| [`../README.md`](../README.md) | The pitch and local setup. | First day. |
| [`../AGENTS.md`](../AGENTS.md) | The short version, for AI coding agents. | If you are one. |

`developer-notes.md` exists locally and is git-ignored: it is the owner's production runbook and
is not part of the repo.

## Section anchors — the convention that keeps this honest

Files that implement a game rule carry a header pointing at the spec:

```ts
// Argument scoring: clamp, standalone cap.
// Spec: game-theory.md §7, §8
```

That pointer is **checked by a test** (`backend/src/lib/specRefs.test.ts`): every
`game-theory.md §N` in either package must name a section the spec actually has. Renumber the
spec without updating the code and CI goes red. This is how the previous generation of docs rotted
and this one is meant not to.

So: **to understand a file, read its header, then read that section of the spec, then read the
code.** Three minutes, and you know why it exists.

---

## 1. How to read this codebase

Depth-first through **one real path**, not breadth-first through every folder:

1. **Entry points.** `backend/src/index.ts` (boots the server + five background jobs) and
   `backend/src/app.ts` (mounts every route group). On the frontend, `frontend/app/layout.tsx` and
   `frontend/app/arena/page.tsx`. Ten minutes here tells you the shape.
2. **The data model.** Read `backend/src/db/migrations/*.sql` **in numeric order** — eighteen files,
   and together they are the whole schema. Section 4 narrates them.
3. **Trace one request end to end.** Pick "post an argument" and follow it: route → controller →
   the AI calls → the SQL writes → the response. Do this once and most of the codebase's
   conventions click. Section 6 walks it for you.
4. **The background jobs.** Five in-process pollers do everything that isn't request-driven.
5. **Then widen out.** The other controllers and components rhyme with what you've already seen.

**The single most useful convention to know first:** anything named `*.logic.ts` is **pure,
side-effect-free logic with a `*.logic.test.ts` beside it**. The messy I/O — SQL, LLM calls — lives
in the sibling non-`.logic` file. To understand *what a decision does*, read the `.logic.ts` and
its tests; to understand *how it is wired*, read the sibling.

Eight pure modules hold most of the game:

| Pure module | Owns | Spec |
|---|---|---|
| `ai/analyst.logic.ts` | argument scoring — the 2–10 clamp, the standalone cap, the 2–98 split clamp; and the Judge's prompt body | §7, §16 |
| `ai/analysis.logic.ts` | the living case — parse, sanitize, attribute, render | §17 |
| `ai/verdict.logic.ts` | the draw threshold, MVP validation, every payout | §11, §12 |
| `lib/duplicate.logic.ts` | verbatim repost detection | §8 |
| `lib/username.logic.ts` | what a username may be | §13 |
| `lib/ledger.logic.ts` | the profile's twelve-week logic chart | §13 |
| `economy/season.logic.ts` | calendar-month season windows | §14 |
| `jobs/featuring.logic.ts` | heat = velocity × side balance, the Main Stage size | §15 |
| `jobs/seasonRollover.logic.ts` | which three users win a finished season, and when there isn't one | §14 |
| `jobs/telegram.logic.ts` | which Telegram updates are trusted, and who a reply is for | §20 |

The frontend uses the same idea without the `.logic` infix — `_components/ui/awardCopy.ts`,
`_components/motion/walkoverRisk.ts`, `_components/motion/verdictCard.ts`, `_utils/logicScore.ts`
and friends are pure and tested.

---

## 2. The shape

A two-package monorepo, no shared package — they talk over HTTP/JSON.

```
crux/
├── backend/                    Node + Express + TypeScript API (raw SQL over Postgres, no ORM)
├── frontend/                   Next.js App Router + React + Tailwind v4
├── docs/                       the four committed docs
├── ops/restore-drill.sh        proves a backup restores
├── .github/workflows/          CI, and the nightly database backup
└── docker-compose.dev.yml      local Postgres + pgAdmin
```

**Backend:** Express 5, `pg` (hand-written SQL — **no ORM**), JWT auth (`bcrypt` +
`jsonwebtoken` + `cookie-parser`), `helmet`/`cors`, `express-rate-limit`, `multer` + `sharp`
(avatars), `aws4fetch` (S3-compatible object storage), `pino` (logs), `@sentry/node`, `tsx` (dev),
`vitest`. LLM calls go through one thin `fetch` client.

**Frontend:** Next.js 16 App Router (React Server Components by default), React 19, Tailwind v4,
GSAP (`@gsap/react`), `axios` (two instances — see §7), `react-icons/pi` (Phosphor),
`react-markdown`, `@sentry/nextjs`, `vitest`.

**Conventions that repeat everywhere:**

- **ESM with `.js` import specifiers** in backend TS — `import x from "./y.js"` even though the
  file is `y.ts`. Required by the Node ESM + TS setup. Match it; do not "fix" it.
- **Controllers hold the SQL.** Routes are one-liners; controllers do request parsing, queries and
  response. There is no repository or service layer beyond the pure modules.
- **The `motions` table is the heart** — one row is a motion *and* its debate.
- **Rules are enforced server-side, always.** Every rule the UI expresses as a disabled button is
  also a check in a controller, because a disabled button is not a rule.
- **Untrusted input is narrowed, never cast.** LLM output and Telegram payloads arrive as
  `unknown` and are coerced field by field.

---

## 3. Run it locally

```bash
docker compose -f docker-compose.dev.yml up -d      # Postgres :5432 (+ pgAdmin :5051)
cp backend/.env.example  backend/.env               # add OPENROUTER_API_KEY
cp frontend/.env.example frontend/.env
cp pgadmin.example.env   pgadmin.env

cd backend  && npm i && npm run db-init && npm run dev   # migrate + seed + API on :8000
cd frontend && npm i && npm run dev                      # Next.js on :3000
```

**Things worth knowing before you lose an hour to them:**

- **`backend/.env.example` is the complete list of knobs**, and `src/config/index.ts` is the only
  place the app reads `process.env`. Add a setting to both — never `process.env.X` at a call site.
  Two documented exceptions: `economy/season.logic.ts` reads `CRUX_LAUNCH_AT` itself and
  `middlewares/rateLimit.ts` reads `EDGE_SECRET` itself, both because they must stay pure and
  importable by tests without dragging `dotenv/config` in as a side effect.
- **Game rules are not configuration.** The §21 constants live in the pure modules, are asserted by
  unit tests, and are printed to users on `/rules`. An env override would make the UI lie.
- **`npm run db-init`** = migrate + seed (30 users and motions with arguments; every password is
  `secret`). `npm run db:seed:stress` loads millions of rows for query testing.
- **To change an existing migration, edit it in place and reset.** `migrate.ts` records each
  filename in a `_migrations` table and skips anything already applied, so an edit is invisible to
  a database that already ran it. The full cycle is `npm run db:reset:dev && npm run db-init`.
  `db:reset:dev` refuses to run under `NODE_ENV=production`. **If `db-init` prints `⏭ skipping`,
  your edit did not land.**
- **The backend needs an LLM key** — OpenRouter, on a paid balance. The provider is swappable via
  `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` with no code change. There is no free tier, but
  there is also no rate ceiling to dodge: hand-testing back to back is fine, and costs about
  $0.0002 a motion (model in section 6).
- **Set `CRUX_LAUNCH_AT=YYYY-MM-DD`** to the real launch date, and never move it afterwards. Season
  numbers derive from it and are written permanently into `season_awards.season_number`. Seasons
  count from 1; Season 1 absorbs the launch month's remainder and closes at the end of the next
  month, and anything before it numbers 0, which the rollover job reads as "never award". This
  replaces `CRUX_SEASON_ZERO` — the API **refuses to boot** if the old name is set and the new one
  is not, so a stale month cannot quietly misnumber a season.
- **Set `NEXT_PUBLIC_SITE_URL` in production**, or share URLs, canonicals, OG images and the
  sitemap all fall back to `localhost:3000`.
- **Avatar uploads fall back to local disk** when the five `R2_*` variables are absent, so you need
  no object-storage account to contribute. The boot log says which mode is live.
- **The Telegram relay is off** without a bot token, and the whole "talk to the developer" web side
  still works. Also logged on boot.

### The gates — all six must pass before you commit

```bash
cd backend  && npm test && npx tsc --noEmit && npm run build
cd frontend && npm test && npm run lint && npx tsc --noEmit && npm run build
```

CI runs exactly these on every push and PR, plus a Docker build of both images on `main`. The
Docker job exists to catch image-only bugs — a `Dockerfile` that forgets to copy something and only
fails in the container.

`npm run eval` (backend) scores the AI against a gold set and **spends real credits**, so it is a
deliberate manual gate, never a CI job. That is what keeps the suite runnable with zero secrets.

---

## 4. The data model — eighteen migrations, one schema

Postgres, raw SQL, applied by a home-grown runner (`db/migrate.ts`, filename-ordered, tracked in a
`_migrations` table). These eighteen files *are* the schema.

> **`0000`–`0015` may be edited in place; `0016` and up may not.** The reset-and-rerun workflow
> below assumes a database you are allowed to throw away. Production is past that point — it holds
> real accounts — so **anything that changes the schema from here on ships as a new numbered file
> using `ALTER TABLE`**, never as an edit to a file production has already run. The runner is
> additive-safe by design: it records filenames and skips what it has applied.

| Migration | Table | What it means |
|---|---|---|
| `0000` | `users` | Identity. `logic_score` is the all-time skill number; `role` (`user`/`admin`) is carried in the JWT and guarded by `requireRole`; `description` is the bio (§13). |
| `0001` | `refresh_tokens` | Opaque refresh tokens, one row per session. |
| `0002` | `domains` | The 12 topic domains, seeded here. The Arbiter prompt's domain list must match these rows. |
| `0003` | `motions` | **The core table.** One row = one motion AND its debate: the claim, both AI-written cases, the live `affirmative`/`negative` split, the lifecycle (`status`, `closes_at`, `winner`, `margin`, `mvp_user_id`, `verdict_text`), and the stage (`heat`, `featured`, `pinned`, `is_motd`, `featured_at`, `motd_at`). |
| `0004` | `arguments` | One contribution to one side. `reply_to_argument_id` is the §6 cross-side reply link (`NULL` = standalone); `points` is what the argument earned. |
| `0005` | `likes` | One row per (user, argument). Deleted on unlike. |
| `0006` | `debate_results` | Per-user W/L/D per concluded debate — the permanent record. `UNIQUE (motion_id, user_id)`. |
| `0007` | `season_awards` | §14 season titles. Permanent, stacking, status-only. `UNIQUE (season_key, rank)` is what makes the rollover job idempotent. |
| `0008` | `notifications` | The four §20 return triggers: `opposition`, `reply`, `verdict`, `season`. |
| `0009` | `logic_events` | The timestamped logic ledger. `season_only = TRUE` writes a row **without** touching `logic_score` — that is how a loss costs the month's race and never the career total. |
| `0010` | *(indexes only)* | `arguments(user_id)`, `motions(user_id)`, `users(logic_score DESC, id ASC)`. Postgres does not auto-index foreign keys, and every profile query filters on those columns. |
| `0011` | `dev_messages` | "Talk to the developer" — one thread per user, relayed to one Telegram chat. A thread is not a table: it is every row for a `user_id` in `created_at` order. |
| `0012` | *(column)* | `motions.normalised_content` — exact-duplicate detection, reusing the arguments normaliser rather than a second copy of it (§8). |
| `0013` | *(column)* | `arguments.content_hash` — SHA-256 of the normalised content, so an exact-duplicate lookup is an index hit rather than a scan. Deliberately not unique: the repost rule varies by author and length, so enforcement stays in `duplicate.logic.ts`. |
| `0014` | *(column)* | `arguments.fingerprint` — sorted trigram hashes, so similarity scoring merge-walks two arrays instead of re-tokenising text (§8). |
| `0015` | `motion_blocks` | Per-motion posting blocks with a reason, an audit trail and a lift record (§22). A table rather than a `COUNT` because "why can't I post here" needs a reason and a timestamp. |
| `0016` | *(columns)* | `users.google_sub` and friends — Google sign-in and account linking (§13). **Also makes `hashed_password` nullable**, for accounts that only ever had Google. |
| `0017` | `email_outbox`, `email_suppressions` | Queued email, its retry state and its delivery record; plus the per-category preference columns and `unsubscribe_token` on `users` (§20). Suppression is keyed on the **address**, not the user — a bounce is a property of a mailbox. |

**Three things to internalise:** there is no `seasons` table (a season is a **computed calendar
month**, §14), `motions.pinned` is the admin override — not a separate curation table — and
`users.hashed_password` is **nullable** since `0016`, so every read of it must tolerate `NULL`
(`bcrypt.compare` throws on one).

---

## 5. The economy — where each number lives

| Number | Meaning | Source of truth | Code |
|---|---|---|---|
| `logic_score` | all-time skill, monotonic, floored at 0 | `users.logic_score` | `economy/logic.ts` `awardLogic()` |
| `logic_events` | ledger of every change, for seasonal windowing | `logic_events` | the same `awardLogic()` |
| season logic | logic earned this calendar month | *computed* — a windowed `SUM(amount)` | `economy/season.logic.ts` |
| record (W–L–D) | all-time standing | `debate_results` | written by `ai/verdict.ts` at conclusion |
| season titles | the only thing that survives a season | `season_awards` | `jobs/seasonRollover.ts` |
| `heat` | stage ranking | `motions.heat` | `jobs/featuring.ts` + `.logic.ts` |

`awardLogic(db, userId, amount, reason, seasonOnly = false)` is the **one place** that touches
`logic_score`. It updates the score *and* inserts a ledger row together, so the all-time total and
the seasonal window can never drift. Every award site — argument, like, unlike, verdict payouts,
abuse penalty — routes through it. `db` is the pool or a transaction client, so it composes inside
a transaction.

**The `seasonOnly` flag is the whole trick.** `awardLogic(..., true)` writes the ledger row and
skips the `logic_score` update. That is the −5 loss penalty (§12): it drags your season board
position down and leaves your career total untouched.

**Seasons are arithmetic, not rows.** `season.logic.ts` derives the current window from `Date`
alone. `previousSeason()` returns `null` below Season 0, so a pre-launch month can never be
awarded.

---

## 6. The AI, and the core flows

### The five personas

All go through `ai/llm.ts` → `llmJson()` → an OpenAI-compatible `/chat/completions` endpoint
(OpenRouter, `deepseek/deepseek-v4-flash:nitro`, swappable by env). **One model runs all five.** Each
persona is one system prompt, one per file in **`backend/src/ai/prompts/`** — those files are the
live strings the controllers import, and each carries a header documenting its inputs, its JSON
contract, and which fields the code re-validates versus takes on trust. Start at
[`ai/prompts/README.md`](../backend/src/ai/prompts/README.md).

| # | Persona | Call site |
|---|---|---|
| 1 | Arbiter | `controllers/ai.controller.ts` — `POST /ai/motion`, nothing is persisted |
| 2 | Opening Brief | `controllers/motion.controller.ts` — `addNewMotion` |
| 3 | Judge | `controllers/argument.controller.ts` — `judgeArgument`; prompt body built by pure `ai/analyst.logic.ts`. Scores the argument AND moves the split, in one call |
| 4 | Verdict Judge | `ai/verdict.ts` — `concludeDebate`; decisions in pure `ai/verdict.logic.ts` |
| 5 | Debater Profiler | `controllers/motion.controller.ts` — `updateDesciption`, best-effort |

**Reasoning is off for all five, deliberately.** Thinking tokens are billed as output *and* count
against `max_tokens`, so leaving it on truncates the shorter calls into invalid JSON — measured, it
turned a 40-token profile line into 267 against a 500-token ceiling. The **Judge** ran as the
documented exception for a while, at `reasoning: "high"` with an 8000-token ceiling, because it has
the headroom and it decides what every score in the product means; it was turned off because it is
also the only call a user waits on with the composer locked. It keeps the 8000-token ceiling — it
emits a six-point case rewrite plus the split, and a truncated response fails the post through every
retry. The replacement for thinking is **decode-first** (§16): each prompt makes the model write its
analysis into fields the code never reads before it emits the number. **Field order in those prompts
is load-bearing**, and with reasoning off it is the only thing keeping scores blind to eloquence.

### What it costs to run

Per event, measured against the live API with reasoning off, at $0.098 in / $0.196 out per 1M
tokens. "Cached" is the same traffic once the static system prompts hit the provider's automatic
prefix cache — treat it as upside, not as the plan.

The **argument-posted** row's token figures predate the scoring/probability merge and have not been
re-measured since; the call count is current, the tokens are an estimate until someone re-runs them.

| Event | LLM calls | in | out | cost | cached |
|---|---|---|---|---|---|
| Motion published | 3 — arbiter + opening analyst + profiler | 1171 | 255 | **$0.000165** | $0.000101 |
| Motion rejected | 1 — arbiter | 501 | 52 | **$0.000059** | $0.000026 |
| Argument posted | 1 — the merged judge | 1081 | 155 | **$0.000136** | $0.000063 |
| Debate concluded | 1 — verdict, at the 40-argument cap | 1553 | 98 | **$0.000171** | $0.000155 |

| Traffic | Monthly LLM bill, cold cache |
|---|---|
| 1k motions / 20k arguments | ~$3 |
| 10k motions / 250k arguments | ~$38 |
| 100k motions / 2.5M arguments | ~$375 |

**Arguments are ~91% of the bill** — the only per-event cost that scales with engagement rather
than with content, and each one costs two calls. If the bill ever needs cutting, the lever is
`updateProbability`: it runs on every accepted argument and is the cheapest to make conditional
(every Nth argument), not the analyst. Note also that `LLM_RETRIES=2` means a failing call bills up
to three times. A walkover conclusion costs nothing — `verdict.ts` returns before the call.

### Flow A — post a motion

`POST /ai/motion` runs the **Arbiter** gate alone (fail → reason + rewrite, shown in the composer;
nothing is written). On pass, `POST /motion` resolves the domain by name, the **Opening Brief**
writes what each side must prove, the row is inserted with `closes_at = NOW() + INTERVAL '48 hours'`, and the
**Debater Profiler** runs best-effort in its own try/catch. The arena is live.

### Flow B — post an argument (trace this one first)

`POST /motion/:id/arguments/:side` → `argument.controller.ts` `postArgument()`:

1. **Validate the text** (`checkText`, max 2000) before anything can spend money.
2. **Refuse if concluded** — the arena is read-only (409 `locked`).
3. **Resolve the side.** Your first argument locks it (409 `side_locked`). For a reply the side is
   *derived* from the target, never trusted from the URL, and the target must exist, belong to this
   debate and be on the opposite side (409 `bad_reply_target`).
4. **Author is FOR-only** — 409 `author_affirmative_only` (§5).
5. **Read every argument in the debate once.** Side counts, this user's prior count, the repost
   check and the analyst's own-side block are all views of the same rows. Captured *before* the
   insert, so a first argument sees `priorCount` 0.
6. **Refuse a verbatim repost** (409 `duplicate_own` / `duplicate_other`) — before the model runs,
   so the exploit costs the attacker a round trip and us no tokens (§8).
7. **Reserve the new argument's id** from the sequence. The Analyst has to attribute a point to a
   row that does not exist yet; an abusive argument is never inserted at all. A failed post just
   leaves a gap in the numbering.
8. **Judge** (ONE call) → `{ decoded_claim, engages, move, verdict, points, newAnalysis,
   shift_reason, affirmative }`. `verdict: "abuse"` → −4 logic, return 201 `{ abused: true }`.
   `verdict: "no_argument"` → 422, nothing inserted, no penalty. On anything but `"ok"` the
   model's other fields are ignored outright — the code does not trust the prompt to zero them.
9. `scoreArgument()` (pure): clamp 2–10 → cap a standalone at 7 (exempt while the opposing side is
   empty). No halving; that rule is gone.
10. **One transaction**: insert the argument with its `points`, `awardLogic`, write the sanitized
    case, and write the new split. Attribution is resolved here against the side's real arguments
    (§17). The split is written only once both sides have argued, and only if `clampAffirmative`
    returned a number — a malformed one is skipped rather than failing a committed post.
11. **Notify** best-effort: the replied-to author, and the opposing side on a new participant.
12. **Respond with the full breakdown** — `{ points, judged, capped, isReply, replyToUsername,
    seasonLogic, seasonRank }` — which is exactly what the points pop-up renders.

### Flow C — conclusion (background, 60s)

`jobs/conclusion.ts` selects live debates past `closes_at` (`FOR UPDATE SKIP LOCKED`, batch 20) →
`ai/verdict.ts` `concludeDebate()` in one transaction: re-check status under `FOR UPDATE` → fetch
top arguments by likes and the distinct participants → **Verdict Judge** → `resolveVerdict` +
`resolvePayouts` (pure) → write `debate_results`, apply payouts via `awardLogic` (losses with
`seasonOnly = true`), set the ruling columns → commit → best-effort notifications, post-commit. A
side with **zero** arguments short-circuits to `walkoverPayout()` with no LLM call.

### Flow D — the stage (background, 5 min)

`jobs/featuring.ts`, **in this order**: recompute `heat` for every live debate (one set-based
`UPDATE` mirroring `computeHeat`) → crown the Motion of the Day if none is held for the current UTC
day, or the reigning one is no longer live → refresh the featured set = the MotD + the top
`MAIN_STAGE_SIZE` by heat + every admin pin. Order matters: the MotD is picked by heat and then
force-featured, because the hero query asks for `featured = TRUE AND is_motd = TRUE`. Crowning
after the refresh would leave a fresh hero invisible for a tick.

### Flow E — season rollover (background, 1 hour)

`jobs/seasonRollover.ts`: if the previous calendar month is Season 0 or later and has no awards on
file, snapshot its final board, write the top three a permanent title and frame, and notify them —
all in one transaction. Idempotent twice over: the already-filed check, and
`UNIQUE (season_key, rank)`.

### Flow F — email (background, 15s)

Nothing sends email inline. Every producer — `notifications/notify.ts`, `ai/verdict.ts`,
`jobs/seasonRollover.ts`, registration, and the admin broadcast — writes a `pending` row into
`email_outbox` and returns. `jobs/email.ts` claims a batch (`FOR UPDATE SKIP LOCKED`), and for
each row **re-checks three things at send time, not at queue time**: the address is not
suppressed, the user still wants that category, and the 24-hour ration has room. Only then does it
sign an SES v2 request with `aws4fetch` — the same client R2 uses — and record the message id.

**The re-check is the point of the whole design.** Queue-time checks would send mail to someone
who unsubscribed thirty seconds ago, and §20 promises they will not.

A failure increments `attempts` and pushes `next_attempt_at` out on a backoff; five failures mark
the row dead. `POST /webhooks/ses` receives SES's bounce and complaint feed over SNS and writes
`email_suppressions`, which the poller consults first for every subsequent send.

With `SES_*` unset the poller never starts and rows simply accumulate — the same shape as the
Telegram relay, so dev and CI need no AWS account and the boot log says which mode is live.

---

## 7. The frontend

- **Server components by default** fetch through `axios.server.ts` (`serverApi`, SSR and build
  time). **Client components** (`"use client"`) fetch through `axios.ts` (`api`, base `/api`,
  attaches the JWT from `localStorage`, refreshes once on a 401). Knowing which axios you are in
  explains most data-flow questions.
- **Same-origin by design.** `next.config.ts` rewrites `/api/:path*` to the backend, so the browser
  only ever talks to the frontend's origin and the auth cookie stays `sameSite: "lax"`.
- **Routes** (`frontend/app/`): `/` (the landing story — ships its own nav and footer),
  `/arena` (the live feed), `/motion/[id]` and the canonical SEO alias `/debate/[slug]` (both
  render `_components/motion/DebateView.tsx`), `/motion` and `/motion/new`, `/domain`,
  `/topic/[keyword]` (SEO hubs), `/archive` (the settled record, filtered by outcome and domain),
  `/leaderboard` (season board by default, `?tab=all-time` for the career board), `/profile/me`
  (client shim → canonical URL) and `/profile/[username]` (numeric segments redirect), `/rules`,
  `/about`, `(auth)/login|register`, plus `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` and
  `apple-icon.tsx`.
- **Generated images**: `motion/[id]/opengraph-image.tsx` (the share card) and
  `motion/[id]/certificate/route.tsx` (the downloadable certificate), both rendered by satori.
  Because satori cannot read CSS variables, `_components/motion/verdictCard.ts` and
  `_utils/brandMark.ts` mirror the palette and the logo as literals — hand-synced with
  `globals.css` and `Logo.tsx`.
- **Component folders** under `_components/`: `arena/` (feed cards, Main Stage, `PinControl`),
  `motion/` (the debate page — header, arena columns, composer, reply context, side-lock
  confirmation, verdict banner, certificate), `compose/` (the motion composer and the Arbiter
  panel), `profile/`, `leaderboard/`, `landing/`, `ui/` (primitives + `PointsPopup`).
  `Navbar.tsx` hosts the notification bell and the developer-message panel.
- **`Navbar.tsx` carries `data-navbar`, and something depends on it.** `motion/StickyMotion.tsx`
  measures that element to park itself at the navbar's bottom edge, so a reader deep in a column
  can still see the sentence being argued. The height is measured, not hardcoded — the nav row
  grows at `md` and with a wrapping search field. Remove the attribute and the rail parks itself at
  `top: 0`, behind the navigation.
- **`_utils/`** holds pure helpers: `slugify`, `debateMeta`, `timeAgo`, `logicScore`, `drawBand`,
  `username`, `animateOnce`, gsap setup.
- **Motion has two kinds, gated differently.** An *entrance* (a page introducing itself) runs
  **once per page per session** — wrap it in `shouldAnimate(key)` from `_utils/animateOnce.ts`,
  keyed on the pathname. *Interaction feedback* (the like pulse, the points pop-up) answers a click
  and is never gated. Surfaces that mount on a later commit than the page — anything client-fetched
  — need their own `pathname#suffix` key. Everything decorative also sits inside
  `gsap.matchMedia()` behind `prefers-reduced-motion`.
- **The transparency layer is a product requirement, not polish.** §19 of the spec lists every rule
  that must be visible *before* it can bite. **If you add a rule that changes a user's outcome, you
  owe it a surface.**
- **Tailwind cannot see class names built at runtime.** Colour-by-variant (award frames, verdict
  rulings, side colours) always goes through a lookup of literal class strings.

---

## 8. Changing a §21 constant — the checklist

`game-theory.md` §21 lists every tunable number. Each is **deliberately not an env var**: it is
asserted by a unit test and, in most cases, printed to users as prose. Changing one is a small edit
in four or five places at once, and missing the copy is how a product ends up lying to its users.

**Every time, in order:**

1. **`docs/game-theory.md`** — §21's table *and* the prose section that explains it. The spec is
   the source of truth; change it first.
2. **The constant** in its `*.logic.ts` module.
3. **Its unit test.** Several assert the literal value (`expect(DRAW_MARGIN).toBe(5)`), so a changed
   constant *fails the suite by design*. That failure is the reminder, not a bug.
4. **Every UI surface that states the number** — §19 requires these, and none is computed from the
   constant unless the table below says so.
5. **Any LLM prompt that encodes it** — the model is told the score bands in prose.

### Where each constant lives

| Constant | Source of truth | Also change |
|---|---|---|
| Debate duration 48h | *no constant* — `INTERVAL '48 hours'` inline in `controllers/motion.controller.ts` | `db/seed-data.ts` (same literal); `/rules` rule 1. Consider extracting it first. |
| Score range 2–10 | `ai/analyst.logic.ts` `SCORE_MIN`/`SCORE_MAX` | `analyst.logic.test.ts`; the band descriptions in `ai/prompts/argument-judge.prompt.ts`; `/rules` rule 3 |
| Standalone cap 7 | `ai/analyst.logic.ts` `STANDALONE_CAP` | `analyst.logic.test.ts`; **`_components/ui/awardCopy.ts` holds its own copy** + its test; `ArgumentPattern.tsx`; `/rules` rule 3 |
| Split clamp 2–98 | `ai/analyst.logic.ts` `AFFIRMATIVE_MIN`/`AFFIRMATIVE_MAX` | `analyst.logic.test.ts`. A sanity bound only — there is no move cap |
| Min argument length 18 | `lib/validate.ts` `MIN_ARGUMENT_CHARS` | `validate.test.ts`. **Deliberately absent from the product surface** — no counter, no distinct error, nothing in `/rules`. Its response must stay byte-identical to the Judge's `no_argument` body |
| Cross-user repost min 40 | `lib/duplicate.logic.ts` `CROSS_USER_MIN_LENGTH` | `duplicate.logic.test.ts` |
| Abuse penalty −4 | *no constant* — inline in `controllers/argument.controller.ts` | the composer fine print in `ArgumentInput.tsx`; `/rules` rule 5 |
| Like / unlike ±2 | *no constant* — inline in `controllers/like.controller.ts` | nothing states it in the UI today |
| Draw threshold 5 | `ai/verdict.logic.ts` `DRAW_MARGIN` | `verdict.logic.test.ts`; **`_utils/drawBand.ts` holds its own copy** and derives the band from it; `/rules` rule 6; `VerdictBanner.tsx` |
| MVP / Win / Loss / Author bonuses | `ai/verdict.logic.ts` `MVP_BONUS` / `WIN_BONUS` / `LOSS_PENALTY` / `AUTHOR_BONUS` | `verdict.logic.test.ts`; `VerdictBanner.tsx`; `MotionForm.tsx`; `landing/Articles.tsx` (the payout table **and** the composer paragraph); `/rules` rule 6. `SideLockConfirm.tsx` no longer states the loss penalty — see the §19 note before putting it back |
| Walkover payout 0 | `ai/verdict.logic.ts` `walkoverPayout()` | `verdict.logic.test.ts`; the banner in `DebateView.tsx`; `VerdictBanner.tsx`; `MotionForm.tsx`; `/rules` rule 6 |
| Walkover warning 6h | `_components/motion/walkoverRisk.ts` `WALKOVER_WARNING_HOURS` — frontend only; it changes *when the warning shows*, never a payout | `walkoverRisk.test.ts` (asserts the boundary); the banner copy in `DebateView.tsx` |
| Tier thresholds | `controllers/profile.controller.ts` `convertLogicScore()` | **`frontend/app/_utils/logicScore.ts` is a full duplicate of the ladder** — change both or the profile and the cards disagree |
| Bio cap 280 | `controllers/profile.controller.ts` `BIO_MAX` | the counter in `BioEditor.tsx` |
| Season length | `economy/season.logic.ts` (the whole module) | `season.logic.test.ts`; the leaderboard strip and the profile season card |
| Season awards top 3 | `jobs/seasonRollover.logic.ts` `TITLES` / `FRAMES` | `seasonRollover.logic.test.ts`; `_components/profile/SeasonTitles.tsx` (`FRAME_BADGE`/`FRAME_RING` need a key per frame); the leaderboard prize line |
| Main Stage size 4 | `jobs/featuring.logic.ts` `MAIN_STAGE_SIZE` | `featuring.logic.test.ts`. **`getSecondaryCardsData` in `arena.controller.ts` has its own `LIMIT 6`** — raise it too or the extra cards never render |
| Heat window / balance floor | `jobs/featuring.logic.ts` | `featuring.logic.test.ts`; the SQL in `jobs/featuring.ts` mirrors the formula (it imports the constants, so only the shape can drift) |
| Username rule | `lib/username.logic.ts` | `username.logic.test.ts`; **`frontend/app/_utils/username.ts` is a full duplicate**; the register form's hint |
| Analysis caps | `ai/analysis.logic.ts` `MAX_POINTS` etc. | `analysis.logic.test.ts`; the caps stated in `ai/prompts/argument-judge.prompt.ts` |

### The four values that exist in two places

Duplicated across the backend/frontend boundary on purpose — the frontend cannot import backend
modules — and they are the ones that silently drift:

- `DRAW_MARGIN` → `ai/verdict.logic.ts` **and** `_utils/drawBand.ts`
- `STANDALONE_CAP` → `ai/analyst.logic.ts` **and** `_components/ui/awardCopy.ts`
- the tier ladder → `profile.controller.ts` **and** `_utils/logicScore.ts`
- the username rule → `lib/username.logic.ts` **and** `_utils/username.ts`

A drift here is invisible to both test suites — each side stays internally consistent while the UI
states a different rule than the server enforces. Grep both packages before calling it done:

```bash
grep -rn "<the old value>" backend/src frontend/app --include="*.ts" --include="*.tsx"
```

Then re-read `/rules` in a browser and confirm the page and the code say the same thing.

---

## 9. "If you want to change X, look at Y"

| Task | Start here |
|---|---|
| How arguments are scored | `ai/analyst.logic.ts` (+ test), then `argument.controller.ts` |
| The verdict or the payouts | `ai/verdict.logic.ts` (+ test), then `ai/verdict.ts` |
| What the AI says or judges | `ai/prompts/*.prompt.ts` — read the file header first |
| The shape of a side's case | `ai/analysis.logic.ts` (+ test) and both analyst prompts together |
| Repost / duplicate handling | `lib/duplicate.logic.ts` (+ test) |
| What's featured, or the MotD | `jobs/featuring.logic.ts` + `jobs/featuring.ts` |
| The season window or numbering | `economy/season.logic.ts` (+ test) |
| Who wins a season | `jobs/seasonRollover.logic.ts` (+ test) |
| Curate the stage by hand | `controllers/admin.controller.ts` + `_components/arena/PinControl.tsx` |
| Add an API endpoint | a `routes/*.route.ts` + a `controllers/*.controller.ts`, mounted in `app.ts` |
| Change the schema | **edit the existing migration in place**, then `db:reset:dev && db-init` |
| Add or change a setting | `src/config/index.ts` **and** `backend/.env.example` — both, always |
| Swap the LLM provider or model | env only (`LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`) |
| Retune a poller or a limit | env only (`*_TICK_MS`, `*_ROWS`, `VERDICT_MAX_ARGUMENTS`, …) |
| Rate limits | `middlewares/rateLimit.ts` — five tiers, and `clientIp()` |
| The debate page UI | `_components/motion/DebateView.tsx` and its children |
| What a pop-up or banner says | `_components/ui/awardCopy.ts` (+ test) and the §19 surfaces |
| Add a notification type | `notifications/messages.ts` (+ test) + `notifications/notify.ts` |
| Add or change an email | `emails/templates.logic.ts` (+ test) for the copy, `emails/queue.ts` for who gets it, `emails/budget.logic.ts` (+ test) if it should be rationed |
| Why an email did not arrive | `email_outbox` first — `status`, `attempts`, `last_error` — then `email_suppressions`, then the user's `email_*` columns. In that order; each answers a different question |
| Google sign-in behaviour | `lib/googleIdentity.logic.ts` (+ test) for link/create/refuse, `lib/googleOAuth.ts` for the two fetches, `controllers/googleAuth.controller.ts` for the wiring |
| The developer DM channel | `jobs/telegram.logic.ts` (+ test) for what an update means, `jobs/telegram.ts` for the loop, `controllers/devMessage.controller.ts` for the web side, `_components/DevMessages.tsx` for the panel |
| Colour, type, spacing, motion | [`design-system.md`](./design-system.md), then `frontend/app/globals.css` |

---

## 10. Gotchas

- **ESM `.js` imports** in backend `.ts` files are intentional.
- **No ORM.** All SQL is inline in controllers — grep the table name to find every touch point.
- **Five pollers, in-process.** No external queue or cron; they run inside the API process, each
  guarded against overlap. That means **they only run where the API runs**: scaling past one
  instance needs a real scheduler first. Deployment pins a single replica, and that pin is the only
  thing enforcing it.
- **The Telegram poller is not a `setInterval`, unlike the other three.** `getUpdates` blocks for up
  to 30 seconds by design, so a fixed interval would stack overlapping requests against the same
  offset. It is a self-rescheduling loop instead, with exponential backoff (1s → 60s) after a
  failure. Its offset lives in memory on purpose: Telegram retains unconfirmed updates for ~24h and
  `dev_messages.tg_update_id UNIQUE` makes a replayed batch a no-op, which is simpler than
  persisting and transactionally advancing an offset.
- **Overlapping deploys are safe.** Two containers can briefly tick their pollers together; each
  poller's real guard is in the database (a status re-check under `FOR UPDATE`, a `UNIQUE`
  constraint with `ON CONFLICT DO NOTHING`), not in its in-process `running` flag — that flag only
  stops a tick lapping itself.
- **`/health` sits above the rate limiter, deliberately.** Unverified traffic shares one bucket, so
  a flood arriving off-edge would exhaust it — and a starved liveness probe would cycle a perfectly
  healthy container.
- **Editing a migration is invisible without a reset.** If `db-init` prints `⏭ skipping`, your edit
  did not land.
- **`docs/superpowers/` and `docs/developer-notes.md` are git-ignored** — local working notes, not
  part of the repo.

---

## 11. Known gaps, flagged and unfixed

Recorded rather than quietly tolerated. None is a secret; all are things a new contributor would
otherwise rediscover the hard way.

- **The bio has two writers.** `PATCH /profile/bio` and the Debater Profiler both write
  `users.description`, so posting a motion overwrites a hand-written bio (spec §13). The intended
  design is in `future-features.md`.
- **Two enforced rules are never disclosed** (spec §19): the author may only argue FOR their own
  motion, and you cannot like your own argument. Both are §19 violations by the project's own
  standard — they need copy on `/rules` and in the composer.
- **`MAIN_STAGE_SIZE` is 4 but `getSecondaryCardsData` hardcodes `LIMIT 6`.** Raising the constant
  alone renders nothing extra.
- **Rate limits are in-memory.** A second backend instance splits every counter, so a "10 per 15
  min" limit becomes 20, and buckets clear on each deploy. That is the Redis trigger, and the same
  single-instance assumption the pollers already require. Deployment enforces one replica, so this
  is a ceiling on scaling rather than a live bug.
- **`clientIp()` is the whole rate-limiting story**, and it is about *provenance*, not about
  finding an IP. Every limiter keys off it. Return the same value for everyone and all five tiers
  become one site-wide budget; return an attacker-chosen value and they mint a fresh identity per
  request and no limit binds at all — including the guard on `/user/login`. The CDN overwrites its
  own client-IP header at the edge, so it cannot be forged *past* the CDN, but a request reaching
  the origin directly can set it freely. So the edge stamps a shared secret and the IP is trusted
  only when it matches; everything unverified shares one bucket — it fails **closed**.
  `X-Forwarded-For` is deliberately never read: proxies *append* to it, so its leftmost entry is
  whatever the client sent. **If you ever add a route that does not pass the CDN, revisit this
  first.**
- **Vocabulary is inconsistent.** The spec fixes the sides as FOR / AGAINST, but the columns, API
  paths and some UI copy say Affirmative / Negative. A rename is a product-wide decision.
- **`Countdown` can hydrate with a mismatch** on a server-rendered debate page — the server renders
  one minute and the client hydrates on the next. Harmless, noisy in the console. Client-fetched
  surfaces that render the same component do not reproduce it.

---

## 12. Contributing

1. Branch off `main`.
2. Read `game-theory.md` for anything you are about to change. If your change alters a rule, change
   the spec **first**.
3. Write the pure logic in a `*.logic.ts` with a test beside it, then wire it.
4. If your change touches a §21 constant, work section 8's checklist.
5. If it adds a rule that changes a user's outcome, give it a surface (§19).
6. Run all six gates. Green means green — do not push a red suite.
7. Open a PR; the template asks for the four things a reviewer actually needs.

Commit messages follow `type(scope): summary` — `feat(ui):`, `fix(sentry):`, `docs(guide):`.

---

## 13. A suggested first afternoon

1. Read `game-theory.md` end to end — 30 min. It is the spec.
2. Read the migrations `0000` → `0011` in order — 20 min. You now know the data model.
3. Read `index.ts`, `app.ts`, then `argument.controller.ts` top to bottom, opening
   `analyst.logic.ts` and `analysis.logic.ts` when they are referenced — 45 min. You now know one
   full flow and the pure-logic convention.
4. Read `jobs/conclusion.ts`, `ai/verdict.ts` and `verdict.logic.ts` — 30 min. You now know how
   debates end and how the economy pays out.
5. Read `ai/prompts/README.md` and one prompt file — 15 min. You now know how the AI is
   constrained.
6. Skim `jobs/featuring.ts` and `_components/motion/DebateView.tsx` — 20 min.

After that, everything else in the repo will look familiar.
