<h1>
  <img src="./frontend/app/icon.svg" width="30" height="30" alt="" align="top" />
  CRUX — The Intellectual Arena
</h1>

> *One claim. One arena. No neutral ground.*

**Crux is a debate platform where every argument ends.** You post a claim, an AI referee decides
whether it can sustain a real fight, two camps form, and you argue for 48 hours. Then a neutral AI
judge rules — a winner, a margin, an MVP, and a written verdict. Your reasoning earns you a score.
Every month the board resets, so anyone can win it.

The complete rules are in **[`docs/game-theory.md`](./docs/game-theory.md)**. This file is the
pitch and the setup.

---

## How it works

| | |
|---|---|
| **An AI gates every motion** | The Arbiter reads your claim before it goes live and rejects the vague and the unarguable, offering a sharper rewrite. You never walk into a debate that was doomed by a bad question. |
| **Two camps, two living cases** | Every debate has exactly two sides, each with an AI-maintained case that is rewritten as arguments land — with every point linked back to the argument that made it. |
| **Your first argument locks your side** | Confirmed before it happens, never discovered after. Nobody can hedge both sides to guarantee a win. |
| **Replies are worth the most** | Answer a specific opponent and you can earn the full 2–10. A standalone argument caps at 7, because it engages nothing in particular. |
| **The clock always runs out** | 48 hours, no extensions. At zero the arena locks read-only and the Verdict Judge delivers the ruling that the whole two days was building toward. |
| **A record, a tier, a season** | Permanent W–L–D and an all-time logic score that never falls — plus a monthly board that resets, so a newcomer can top it in week one. |
| **Nothing is hidden** | Every rule that can cost you something is shown *before* it can bite, and every award shows its arithmetic. A rule that is not surfaced is treated as a bug. |

Read [`docs/game-theory.md`](./docs/game-theory.md) for the mechanics, the numbers, and the
reasoning behind each one.

---

## Documentation

| File | What it owns |
|---|---|
| [`docs/game-theory.md`](./docs/game-theory.md) | **The spec.** Every rule, every number (§21), and why. If anything else disagrees with it, it wins. |
| [`docs/codebase-guide.md`](./docs/codebase-guide.md) | How the code is organised, how a request flows, and where to change what. **Start here to contribute.** |
| [`docs/design-system.md`](./docs/design-system.md) | Colour, type, shape, motion, voice. |
| [`docs/future-features.md`](./docs/future-features.md) | Designed-and-deferred features — check before proposing one. |
| [`AGENTS.md`](./AGENTS.md) | The short version, for AI coding agents. |

Files that implement a game rule carry a header pointing back at the spec
(`Spec: game-theory.md §7`), and a test fails if any of those pointers goes stale. Read a file's
header, then that section of the spec, then the code.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, GSAP |
| Backend | Node.js, Express 5, TypeScript, hand-written SQL (no ORM) |
| Database | PostgreSQL |
| AI | OpenRouter — one model behind all five personas, swappable by env |
| Auth | JWT access tokens + database-backed refresh tokens |
| Tests | Vitest, on pure logic only — the whole suite runs with zero secrets |
| Local | Docker Compose (Postgres + pgAdmin) |

```
crux/
├── backend/                    Express API
│   └── src/
│       ├── ai/                 the six AI personas, their prompts, and the pure judging logic
│       ├── controllers/        request parsing + SQL + response (no service layer)
│       ├── db/migrations/      twelve .sql files — together, the whole schema
│       ├── economy/            logic awards and the season window
│       ├── jobs/               four in-process pollers
│       ├── lib/ middlewares/ notifications/ routes/
├── frontend/                   Next.js app
│   └── app/
│       ├── _components/        arena · motion · compose · profile · leaderboard · landing · ui
│       ├── _utils/ _hooks/
│       └── <routes>
├── docs/                       the four committed docs
├── ops/                        the restore drill
└── .github/workflows/          CI, and the nightly database backup
```

---

## Setup

**You need:** [Docker Desktop](https://www.docker.com/products/docker-desktop/), Node 24+, and an
[OpenRouter API key](https://openrouter.ai/keys) with credit on it. There is no free LLM tier, but
running costs are tiny — roughly **$0.0002 per motion** and **$0.00014 per argument**.

```bash
git clone https://github.com/Nitesh-Kumar-7557/crux
cd crux

cp backend/.env.example  backend/.env      # then add your OPENROUTER_API_KEY
cp frontend/.env.example frontend/.env
cp pgadmin.example.env   pgadmin.env       # pick any email + password

docker compose -f docker-compose.dev.yml up -d     # Postgres :5432, pgAdmin :5051
```

```bash
cd backend && npm i
npm run db-init        # migrate + seed — 30 users and motions, every password is "secret"
npm run dev            # API on :8000
```

```bash
cd frontend && npm i
npm run dev            # app on http://localhost:3000
```

`backend/.env.example` is the complete, annotated list of every setting. The two that matter most
in production are **`CRUX_SEASON_ZERO`** (the launch month — season numbers derive from it) and
**`NEXT_PUBLIC_SITE_URL`** (or share links and the sitemap point at localhost).

Avatar uploads fall back to local disk when object-storage credentials are absent, and the
developer-message relay is simply off without a bot token — so neither is needed to run or
contribute. The boot log says which mode each is in.

**Stopping:** `docker compose -f docker-compose.dev.yml down`, or `down -v` to drop the database
volume too.

---

## Contributing

1. Read [`docs/codebase-guide.md`](./docs/codebase-guide.md) — the map, the flows, and the
   change-checklists.
2. Branch off `main`. If your change alters a rule, change
   [`docs/game-theory.md`](./docs/game-theory.md) **first**.
3. Put decisions in a pure `*.logic.ts` with a test beside it, then wire it up.
4. If it adds a rule that changes a user's outcome, give it a surface (spec §19).
5. Run all six gates:

```bash
cd backend  && npm test && npx tsc --noEmit && npm run build
cd frontend && npm test && npm run lint && npx tsc --noEmit && npm run build
```

CI runs exactly these on every push and PR. Commit messages follow `type(scope): summary`.

---

## Deployment

The frontend is public and the API is not: Next rewrites `/api/:path*` to the backend over a
private network, so the browser only ever talks to one origin, the auth cookie stays
`sameSite: lax`, and the API has no public route at all.

```
Browser ──HTTPS──> CDN ──> frontend (Next.js, public)
                                │ /api/* rewrite
                                ▼
                           backend (Express, private) ──> Postgres
```

Deploying is a push to `main`: CI must go green first, then migrations run in a pre-deploy
container — so a failed migration halts the deploy instead of taking the running site down.
Rolling back is redeploying a previous build. Uploaded avatars go to object storage rather than to
disk, because container filesystems are discarded on every deploy.

`ops/restore-drill.sh` restores a nightly dump into a throwaway container and prints row counts —
the proof that a backup is a backup, and the recovery procedure if the database is ever lost.

---

## Search

Crux is a public, indexable site. Most of the work is ordinary hygiene; the parts worth knowing
are where a debate's identity lives and how the site behaves while it is still empty.

| What | Where | Why it is like that |
|---|---|---|
| **Server-rendered HTML** | React Server Components by default | Content is in the response, not assembled after hydration. Search crawlers render JS on a delayed second pass and most AI crawlers do not render it at all. |
| **One canonical URL per debate** | `_utils/debateMeta.ts` | `/motion/[id]` and `/debate/[slug]` render the same `DebateView`, so both declare the `/debate/[slug]` form as canonical and only one is ever indexed. |
| **Title template + per-route metadata** | `app/layout.tsx`, each `page.tsx` | `%s · Crux`, with a description on every route that has one to give. |
| **Site identity** | `app/layout.tsx` | `Organization` + `WebSite` JSON-LD. Without it nothing states that "Crux" is an entity rather than a common noun, which is what a brand query resolves against. |
| **Debate structured data** | `_components/motion/debateJsonLd.ts` (+ test) | **The type changes when the debate ends.** Live it is a `DiscussionForumPosting`; once the Verdict Judge rules, the verdict *is* the answer, so it becomes a `QAPage`. A walkover has no ruling (§11) and stays a forum thread. Emitting a `QAPage` with nothing to answer is invalid and earns nothing. |
| **`noindex` on empty surfaces** | `topic/[keyword]`, `profile/[username]` | A topic hub with no debates, or an account that has never argued, is a soft 404 — and enough of them read as a *site-wide* quality problem, not a per-page one. `follow` stays on, and each page indexes itself again the moment it has something to show. Nothing to undo later. |
| **Sitemap** | `app/sitemap.ts` | Every debate at its canonical URL, plus each topic hub. `lastmod` is the one hint Google still acts on: a concluded debate reports `closes_at`, a live one reports now. `revalidate = 3600` — without it Next prerenders the file and every debate created after a deploy stays out of it. |
| **Crawl rules** | `app/robots.ts` | Forms and redirect shims are disallowed. Everything else stays crawlable, because a page that must not be *indexed* says so with its own `noindex` — and a robots block would stop a crawler ever reading that tag. |
| **Share cards** | `opengraph-image.tsx`, `motion/[id]/opengraph-image.tsx` | Generated by satori, per motion. |

**`NEXT_PUBLIC_SITE_URL` is the single point of failure, and it fails quietly.** Canonicals, OG
image URLs, the sitemap and the robots sitemap pointer are all built from it. Next inlines
`NEXT_PUBLIC_*` at **build** time, so it must be present when `next build` runs — in Docker that
means an `ARG` in `frontend/Dockerfile`, not just a runtime variable on the host. Miss it and every
one of those URLs silently becomes `localhost:3000` in a site that otherwise looks perfectly fine.

**The CDN prepends its own block to `/robots.txt`.** What is served is `app/robots.ts` plus
whatever Cloudflare is configured to add — including its managed AI-crawler rules. Read the live
file, not just the module.

---

## License

MIT — see [LICENSE](./LICENSE).

<p align="center"><em>Where arguments are decided.</em></p>
