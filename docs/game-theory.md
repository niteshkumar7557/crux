# Crux — Game Theory & Product Design

*Started 2026-07-18 in a brainstorming session. **§0–7 document how the app works today** (read from the code); **§8–13 are agreed future designs** decided across the brainstorming sessions. Nothing in §8+ is built — this is product design, not implementation.*

## Status & where to resume

**Decided (in this doc):**
- **§8 — Concluded state:** timed matches, a Verdict Judge persona, a two-axis `logic`+`record` economy, draw/walkover edge states, integrity rules (commit-to-one-side; defend the logic axis by design, not detection).
- **§9 — Retention L1 · Liquidity:** concentrate attention (Main Stage / Undercard), hybrid-that-evolves curation, an underdog/upset bonus.
- **§10 — Retention L2 · Return triggers:** two-tier real-time + digest notifications (in-app + email).
- **§11 — Retention L4 · Growth:** the game-as-content-factory SEO flywheel; slug URLs + topic hubs + SSG; rounds/rematch as the bridge from concluded pages to live participation; labeled seed scaffolds; human debate as the moat.
- **§12 — Retention L3 · Habit & progression:** every number splits into a seasonal race (resets to 0, fair for newcomers) + a career monument (never resets); one 4-week heartbeat that also gates §11.3 rematches; a weighted-LP division ladder with a soft reset; Season + Legends boards; a status-only Season Finale whose rewards buy §9.2 governance. No decay, no streaks (both designed, then cut).
- **§13 — Live Video Arena (Premiere v1):** a hand-curated, recorded-then-premiered marquee debate — 2 dev-picked opponents, ~30 min, **5 domain-lens rounds**, an AI judge (local STT → LLM → TTS) ruling each round aloud + a spoken closing verdict. Human on-camera host + a control cockpit. Deliberately a **standalone marketing showcase** (not §12-wired); ships a Past-Video-Debates home tab + a shareable verdict card. Evolves: premiere→live, human-host→AI-host, standalone→economy-integrated.

**Design complete — the whole product is now specified (§0–13).** What remains is the **build phase** (every future section carries its own "implementation consequences" notes) and the video arena's **v2 upgrades** — live-streaming, AI host, and economy-integration — which arrive together as "AI-host live."

### Build progress (§8 is now under construction)

- **§8 Slice 1 — Conclusion engine backend (DONE, uncommitted 2026-07-18).** Schema migration `0007` (arguments lifecycle cols + `debate_results` table), in-process 60s poller (`backend/src/jobs/conclusion.ts`), Verdict Judge persona + `concludeDebate` (`backend/src/ai/verdict.ts`), pure decision logic under vitest (`backend/src/ai/verdict.logic.ts` — 10 tests), side-lock on comment POST, `closes_at` on new statements, seed-dev seeds live 48h matches. Spec/plan: `docs/superpowers/specs/2026-07-18-conclusion-engine-design.md`, `docs/superpowers/plans/2026-07-18-conclusion-engine.md`.
- **§8 Slice 2 — Frontend wiring (DONE, uncommitted 2026-07-18).** Live countdown, Verdict card (`VerdictBanner`), FINAL bar, read-only concluded arena, side-lock 409 toasts + opposite-side pre-disable, profile W-L record card; backend added `mvp_username` on `/argument/:id` and `record` on `/profile/:id`. Spec/plan: `docs/superpowers/specs/2026-07-18-conclusion-frontend-design.md`, `docs/superpowers/plans/2026-07-18-conclusion-frontend.md`.
- **§8 deferred (not built):** the Verdict **share-card image** (§8.6), the **thread-relative analyst-prompt rewrite** (§8.5 integrity), the **hot-extension** (§8.1), the losing-side **standout** nod (§8.3), and **feed/domain card** countdown+concluded states.
- Both slices verified (backend: vitest + real conclusion runs; frontend: tsc + lint clean, Playwright 0 console errors). **Nothing is committed** — two commit messages were handed over.

**Working rule:** the user commits — hand over a commit message, never run `git commit`.

---

## 0. The vision (in your words)

> People argue but never conclude, and there is no un-biased judge to give a verdict. Crux is a platform where users post their opinions and an AI is the neutral judge — an external LLM says how good each statement is and scores accordingly.

Two ideas are load-bearing here: **judgment** (an AI referees quality) and **conclusion** (arguments should end somewhere). The current build has fully realized the first and has **not** built the second. That single gap is the spine of everything we'll discuss next.

---

## 1. Glossary — the words, pinned down

You've used *statement / argument / debate / debater / comment* loosely. Here is what each one actually maps to in the running system. We should keep these fixed from now on.

| Word | What it really is in the code | Note |
|---|---|---|
| **Statement** | The claim a user submits — the raw text of one bold declarative sentence. | Lives as `arguments.content`. This is the *thing being debated*. |
| **Argument** | The **live debate arena** built around one statement (its For case, Against case, probability, comments). One statement → one argument. | The DB table is literally `arguments`. Confusingly, this is the *container*, not a single point. |
| **Debate** | Informal synonym for an argument-arena in motion. No separate entity. | Use interchangeably with "argument (the arena)". |
| **Comment** | One user's contribution to **one side** (`for` / `against`) of an argument. | This is what most platforms would call "an argument" or "a point." In Crux it's a comment. |
| **Debater / User** | A registered account with a global `logic_score` and an AI-written identity blurb. | Everyone is a debater; there is no separate role. |

**The one rename worth considering later:** a "comment" is really a *contention* or *point* — it's the atomic unit of actual debating, and calling it a comment undersells it. Flagging only; no action.

---

## 2. The core loop (end to end)

```
  POST a statement                    JOIN a debate
  ───────────────                     ─────────────
  1. User writes a claim + picks      5. User reads the live For/Against
     a domain (or AUTO).                 analyses + current probability.
        │                                    │
        ▼                                    ▼
  2. ARBITER (LLM) judges it:         6. User posts a COMMENT on one side.
     pass / fail.                        │
     - fail → reason + a rewrite         ▼
       to try instead.                7. ANALYST (LLM) moderates → scores
        │                                 4–8 → rewrites that side's running
        ▼  (on pass)                      analysis, crediting the commenter.
  3. User broadcasts.                     │
        │                                 ▼
        ▼                             8. Commenter's global logic_score
  4. ANALYST (LLM) writes the            += points. (Likes on it later add +2.)
     opening FOR case and AGAINST         │
     case. Argument arena goes live.      ▼
        │                             9. Once BOTH sides have ≥1 comment,
        └──────────────► arena ──────►    PROBABILITY judge sets the live
                                          win split. Recomputed every comment.
```

Then… it just keeps going. There is no step 10. The arena never closes, never declares a winner, never archives with a verdict. **That absence is deliberate — it's the piece you haven't designed yet.**

---

## 3. The "AI judge" is actually five personas

Your vision says "an AI is the neutral judge." In the build, that judge is split across **five distinct LLM calls**, each with its own system prompt. Worth seeing them separately, because future features will attach to specific ones.

| # | Persona | When it fires | What it decides | Model |
|---|---|---|---|---|
| 1 | **Arbiter** (gatekeeper) | On statement submit | pass/fail eligibility, an improved rewrite, the keyword, the domain | smart |
| 2 | **Debate Analyst** (case-builder) | When an argument goes live | The strongest opening FOR case and AGAINST case (40–60 words each) | smart |
| 3 | **Analyst / Moderator** (per-comment) | On every comment | Abuse check → quality score 4–8 → rewrites that side's running analysis, crediting users by name | smart |
| 4 | **Probability judge** | On every comment once both sides are populated | The live win split (each side 20–80, sums to 100), judged on analysis quality only | smart |
| 5 | **Debater profiler** (identity) | After you post a statement | Rewrites your profile blurb ("how you think") from your last 25 statements | fast |

**Key nuance for later:** the probability judge scores the *synthesized analyses*, not raw comments or vote counts. And your identity blurb is inferred from the **statements you choose to open** — not from how you argue in comments. Neither of these is wrong, but both are design choices worth revisiting.

---

## 4. The scoring economy (the actual game theory today)

There is exactly **one persistent number**: a user's global `logic_score` (starts at 0). Everything social — rank, tier, profile bar — derives from it.

**Where logic_score comes from:**

| Event | Δ logic_score | Who gets it |
|---|---|---|
| Your comment is accepted | **+4 to +8** (AI quality score) | the commenter |
| Someone likes your comment | **+2** | the comment's author |
| Your comment is flagged as abuse | **−4** (and the comment is discarded) | the commenter |

**logic_score then maps to identity:**

| Score | Tier | Grade |
|---|---|---|
| 0–49 | beginner | B |
| 50–99 | intermediate | B+ |
| 100–149 | skilled | A |
| 150–199 | expert | A+ |
| 200+ | master | M |

…and to a **global leaderboard rank** (ordered by logic_score).

### The four holes in the current economy

These aren't bugs — they're the incentive gaps that a game-theory pass should address. Naming them now so the next conversation is grounded:

1. **Posting a statement earns you nothing.** Only *commenting* is scored. The person who opens a great debate gets no points for it — only the people who pile in do. The creator role is economically invisible.
2. **Winning a debate is cosmetic.** The win-probability split is per-argument and never touches logic_score. There's no persistent payoff for being on the winning side, or for authoring a statement that the arena ultimately vindicates.
3. **Nothing ever concludes**, so there's never a *payoff moment* — no resolution the probability is building toward. The number just drifts. Suspense with no verdict is suspense that leaks.
4. **The score only goes up (mostly).** Apart from the abuse penalty, logic_score is a ratchet — quantity of decent comments beats quality of rare great ones over time. There's no decay, no stake, no risk. That tends to reward grinding over sharpness.

---

## 5. What exists around the loop

Supporting surfaces that are already built (per the frontend audit):

- **Discovery:** home arena (featured + trending/newest), a 12-domain browser with pagination, debounced search.
- **Identity:** profile pages (AI blurb, reputation bar, rank, recent statements, avatar — custom upload or 18 presets).
- **Status:** leaderboard (top-50 podium + standings).
- **Static:** rules, about.

Notably **absent** (retention surfaces that don't exist yet): notifications, follows/subscriptions, any email, personalized feed, streaks, activity history, replies/threads on comments, real sharing (the share button is a dead stub).

---

## 6. The deliberate gaps — your stated unknowns

Three things you've said you want but haven't designed. Documented here as open, not as decided:

1. **A "concluded" state for every statement.** *Not built.* The `arguments` table has no status, no winner, no `concluded_at`. Debates are perpetual. This is the biggest single lever — it turns an endless feed into a game with rounds.
2. **A final verdict from the judge.** *Partially built.* There's a live probability, but the AI never delivers a closing judgment ("here's who won and why"). The "verdict" your vision promised is the missing capstone of the concluded state.
3. **Live video-streaming debate arena with a speaking TTS AI judge.** *Not built, no scaffolding.* A separate, much larger product surface — a synchronous mode on top of today's asynchronous one.

---

## 7. Observations to carry into the next discussion

When we talk features + retention, these are the threads I'd pull, in rough priority:

- **Conclusion is the keystone.** Almost every retention mechanic (verdicts, rewards for winning, "your debate concluded" notifications, seasons/rounds, shareable outcomes) depends on debates *ending*. Design this first; much else follows.
- **Reward the creator.** Close hole #1 so opening a great statement is worth doing.
- **Make winning matter.** Close hole #2 so the probability bar is playing for stakes.
- **Add a reason to come back.** The loop has no "pull" — nothing notifies you that your argument moved, someone challenged your point, or your debate concluded. Retention lives here.
- **Acquisition needs an artifact.** Right now there's nothing shareable that carries the product's flavor outward (a verdict card, a "I won this debate" image, a sharp statement permalink). The share button being dead is a symptom.

---

## 8. Concluded State — Agreed Design (2026-07-18)

*Decided in the brainstorming session. This is the first "future" subsystem, now specified at the product level. Two remain open: retention/growth and the live video arena.*

**In one line:** a Crux debate is a **timed match between two committed camps**; when the clock runs out a **Verdict Judge** rules a winning side + names an MVP, paying out to a new two-axis economy, with integrity rules that keep the game honest.

### 8.1 Lifecycle & trigger
- Statement passes the Arbiter → goes live as a match with `closes_at`. **Default 48h**, with a **hot-extension** (a short auto-extension if comment velocity is high in the final hours) so a live debate doesn't die mid-swing.
- At zero the arena **locks read-only**; the Verdict fires.

### 8.2 The Verdict Judge (a 6th LLM persona)
- During the match, the probability bar is a **running forecast**. At lock, a distinct closing call reads the statement, both final analyses, and the scored comments and returns the **ruling**: `{ winner: for|against|draw, margin, mvp:{username,side}, closing }`.
- `closing` is a short editorial paragraph naming the crux and *why* it resolved — the capstone verdict the vision was missing, and the text on the shareable card.

### 8.3 The economy — two numbers now
- **`logic_score` = skill.** Accrues only from in-match behavior (comment quality 4–8, +2 per like), as today.
- **`record` = W–L.** New. Comes only from concluded debates.

| Who | logic (skill) | record (W–L) |
|---|---|---|
| Every comment, in-match | +4–8 quality / +2 per like — unchanged | — |
| Winning-side commenters | — | +1 win |
| MVP (best debater, any side) | + modest "sharpest mind" bonus | marquee win |
| Losing-side standout (anti-bandwagon) | small nod | "stood out in defeat" mention |
| Losing-side commenters | — | +1 loss (no points drained) |
| Statement author | bonus scaled by debate quality | — ("Authored" credit) |

- **Winning-side reward is deliberately small** — the real payoff (MVP, logic) needs actual contribution, so bandwagoning late onto the likely winner is low-value.
- `record` is **all-time for now**; a **seasonal ladder** is deferred to the retention subsystem.

### 8.4 Edge states (exploit-proofing)
- **Draw** — margin inside ~±6 (53–47 or closer): no side win; both sides log a draw; MVP still crowned.
- **Walkover** — a side is empty at lock: concludes "unopposed," **no record rewards** (you can't win a contest nobody entered), only a reduced author credit. Kills the "post + self-comment one side to farm wins" exploit.

### 8.5 Integrity rules
- **Commit to one side.** Your **first comment locks your side** for that debate (per-debate, not a global stance — take the other side in a different match). Kills the "comment on both sides → guaranteed win" exploit and preserves the two-committed-camps drama. Enforced by a lookup on the user's existing side for that argument.
- **External AI: defend by design, never by detection.** No AI-text detector — they're unreliable, an arms race, and they false-flag non-native English speakers. Instead, three scoring shifts make pasting generic AI output a *losing* strategy:
  1. **Score thread-relative value, not abstract quality.** Rewrite the analyst rubric to reward rebutting a **named opponent's specific point** and adding something **not already in the current analysis**; a cold-pasted essay that ignores the live thread scores low.
  2. **Status lives in the competitive `record`, not comment volume** — winning contested matches against committed opponents is far harder to farm than raw logic points.
  3. **Deflate the ratchet** — diminishing returns on repeated comments in one debate; weight comments that **survive into the winning analysis or are credited in the verdict** higher.

### 8.6 The shareable artifact
- A locked debate renders a **Verdict card** (winner, margin, MVP, the closing line) — a generated share image (same technique as the existing OG cards). The outward-facing unit that closes the "nothing shareable" gap and seeds acquisition. Concluded debates flow into the domain/archive browser as **settled matches**.

### 8.7 Implementation consequences (for the build phase, not now)
- **Schema:** `arguments` needs `status(live|concluded)`, `closes_at`, `concluded_at`, `winner`, `margin`, `mvp_user_id`, `verdict_text`; users need a W–L `record` (a `debate_results` table is the cleaner home).
- **Scoring:** the per-comment analyst prompt (`MODERATOR_ANALYST_SYSTEM_PROMPT`) must be rewritten for thread-relative scoring (integrity rule #1).
- **Jobs:** a scheduler to fire the Verdict at `closes_at` (and evaluate the hot-extension).
- **Enforcement:** a side-lock check on the comment POST.

---

## 9. Retention Layer 1 — Liquidity & Concentration (Agreed Design, 2026-07-18)

*First of the four retention layers. The reframe that drove it: for a thin userbase, retention is a **liquidity** problem before it's a notifications problem — a ping that leads someone back to a dead arena makes churn worse. So liquidity is the substrate.*

**Backbone: concentrate attention** (chosen over active-matchmaking and an AI House backstop). With few users, a sprawling feed gives 1,000 statements zero opponents each; concentration gives a handful of debates a crowd each. Same users, opposite outcomes.

### 9.1 The "Main Stage / Undercard" structure
- **Main Stage** = the home page: one hero **Debate of the Day** + a small rotating set (~4) of **featured live matches**. The attention pool — these reliably get opponents + momentum. Daily cadence.
- **Undercard** = every other statement still goes live and stays browsable (domains/search), just not on the stage. **No hard throttle** — posting always works instantly; concentration without gatekeeping supply.
- **Graduation** — an Undercard debate that earns early heat (or is elected) is promoted to the Stage. This pipeline keeps the Stage fresh and **closes hole #1**: a sharp statement earns *the spotlight* (its own reward + a near-guaranteed real contest + the author bonus). Posting finally pays.
- **Clock coherence:** featured debates are just §8 timed matches running on stage — a DotD can run a punchier **24h** clock while off-stage debates keep the **48h** default (tunable).

### 9.2 Curation: hybrid that evolves
- Engine = **Arbiter quality-gate** (already exists) + **algorithmic heat** (comment velocity, balance) + a **community-vote** candidate surface, with an **editorial override** slot.
- The honest cold-start→scale path: **editorial-heavy now** (low volume, you *can* hand-pick, and it sets the tone) → **heat + votes take over** as real signal appears. One design that fits both today and later.

### 9.3 Within-debate liquidity: the underdog / upset bonus *(proposed economy tweak on §8 — confirm or cut)*
Concentration fills *debates*; this fills *sides*. Surge-price the scarce side:
- Taking the **empty or trailing side** grants a small **logic multiplier** on your comments there (pay more for supplying the scarce side).
- **Winning from behind** grants a marquee **upset bonus** on the record — the harder achievement, anti-bandwagon, and very shareable ("won 60–40 from a side that was losing 30–70").
- Gaming is contained by the §8.5 **commit-to-one-side** rule (you lock the underdog side deliberately; you can't flip to farm the multiplier) and by the verdict rewarding *quality*, not mere presence.
- Surfaced via an **"arenas needing your side"** routing view (also the natural target for the return-trigger layer).

### 9.4 Deferred / optional (noted, not chosen)
- **House backstop (AI fills a side)** — kept *off by default* to protect the human-vs-human ideal; concentration + underdog bonus should make empty featured sides rare. Available later as an emergency floor if a featured debate is about to walk over.
- **Challenge / duel** (call out a specific opponent) — moved to the **growth** layer: it's really a viral invite loop, not the liquidity backbone.

### 9.5 Implementation consequences (build phase, not now)
- **Schema/state:** a `featured` flag (or a `stage` table) on `arguments`; a `heat` score (velocity-derived); a candidate **votes** surface (later); the underdog multiplier needs each side's live comment count at post time (already queried in §8's comment flow).
- **Jobs:** a daily scheduler to rotate the Debate of the Day and refresh the featured set as debates conclude.
- **Queries:** the "needs an opponent / trailing side" query powers both the routing view and the underdog multiplier.

---

## 10. Retention Layer 2 — Return Triggers (Agreed Design, 2026-07-18)

*Largely determined by the §8/§9 events — a quick pass. Golden rule: every notification must lead to a **live** arena, which §9's liquidity work now guarantees (a ping to a dead room makes churn worse).*

**Two tiers of events:**
- **Real-time** (personal, actionable, rare — the *pull*): you were **rebutted by name**; your authored debate got its **first opponent**; your debate **closes in ~2h**; the **verdict's in** (won / lost / MVP / upset).
- **Digest** (ambient, batched — the *habit anchor*): the Debate of the Day, **arenas needing your side** (your domains), your **record/rank movement**, debates you're in that concluded.

**Channels:** in-app **inbox/bell** always; **email** for both tiers — transactional for real-time, a daily/weekly **digest** for ambient (email is the reactivation workhorse and addresses are already stored). Web push deferred.

**Anti-annoyance budget:** cap real-time notifications per user per day; batch overflow into the digest; per-category unsubscribe; deep-link every notification to the live arena/payoff.

**Build-first trigger:** *"someone rebutted your point"* — personal, ego-engaging, time-sensitive. Nail this before the rest.

**Implementation consequences:** a `notifications` table + inbox endpoint; enqueue hooks on the comment / verdict / graduation flows; an email sender (transactional + a scheduled digest job); a user notification-preferences record.

---

## 11. Retention Layer 4 — Growth: SEO Content Engine (Agreed Design, 2026-07-18)

*Chosen backbone over challenge-loop and community-beachhead, because the game is already a content factory and its exhaust is exactly what search rewards — so growth compounds with **zero** starting audience. (Beachhead + a launch burst are still the near-term first-cohort companions; see 11.6.)*

### 11.1 The flywheel (the thesis)
**game → concluded debates → evergreen SEO pages → search traffic → conversions → more debates.** SEO is the core loop's exhaust turned back into fuel — not a bolt-on. The concluded-state work (§8) *is* the growth asset. The **moat**: real human argument + a lived verdict, which AI-content farms can't fake and which Google's helpful-content system now requires. The game keeps the SEO legitimate; the SEO feeds the game.

### 11.2 The indexable artifact (the concluded page)
- **Slug URLs:** `/debate/<claim-slug>`, canonical + permanent; opaque `CRX-id` URLs 301 → slug. The claim *is* the query — put it in the URL.
- **Page:** verdict-answer up top (snippet / AI-overview citation bait), both final cases, MVP + top human arguments, `schema.org` markup, the verdict card as the OG image, meta from the verdict.
- **Topic hubs:** aggregate pages on the 12 domains + the existing `content_keyword` (`/topic/<keyword>`), internally linked to every debate → crawl depth + topical authority.
- **Render:** SSG/ISR — concluded pages are immutable → fast, cheap, perfectly indexable.
- **Progressive access:** read free; signup wall only at *participate* (already the "spectator mode" pattern).

### 11.3 The bridge-to-live: Rounds (rematch) — *the make-or-break decision*
A locked page is a dead end unless it leads somewhere joinable.
- A claim's canonical page accumulates **rounds** (seasons): Round 1 concludes with a preserved verdict; a fresh live **Round 2** opens on the same URL for newcomers to join.
- **Dedup becomes a feature:** near-duplicate claims **merge into rounds of one canonical debate** instead of splitting into competing dead pages — repurposing the current similar-fights/Arbiter dedup concern into structure. One strong URL per claim, gaining authority over time.
- **Rounds = seasons:** the rematch cadence is the *same clock* as L3's seasonal ladder (deferred). A claim re-runs per season on a cooldown, so a rematch is a deliberate event, not spam. Past rounds' verdicts + MVPs are preserved on the page.
- **Always-on fallback:** *related live debates* (existing similar-fights / domain machinery) for topic-level conversion when no rematch is open.

### 11.4 Seeding: live scaffolds, not fake verdicts
- Seed a curated base of **evergreen** claims (targeting real search demand) as **live** debates: AI writes both cases (existing Debate Analyst), optionally the House plays a few opening exchanges. **Clearly labeled** ("opened by the House"), **open for humans** to join and conclude.
- Honesty rule: **a seed is a live scaffold, not a fake-concluded page.** Indexable immediately (claim + both cases + "join"); it grows richer and earns a *real* verdict as humans argue. No fabricated users or verdicts → authentic + Google-safe.
- Prefer **timeless** claims (ethics, philosophy, policy perennials) over news — evergreen compounds; news decays.

### 11.5 Amplifiers (layered on the SEO backbone)
- **Verdict card** (§8.6): the social-share unit — "I won 63–37 / I'm MVP" — and the OG image on every page.
- **Challenge loop** (§9.4): the 1:1 active invite ("defend the other side → [link]"), also liquidity. Accelerates growth but doesn't originate it — SEO is the base, this is the multiplier.

### 11.6 Honest expectations & metrics
- **SEO is slow** — months to rank; a compounding strategy, not a spike. Pair with a **community beachhead** (first cohort whose debates become the first pages) + a one-time **launch burst** (PH/HN/social) to bootstrap.
- Optimize: breadth of long-tail claim coverage, page depth/quality, internal linking, crawlability, Core Web Vitals. Watch: indexed pages, keyword coverage/impressions, SEO→signup conversion, rounds reopened.

### 11.7 Implementation consequences (build phase)
- **Slug/URL system** + canonical + 301s from `CRX-id`; slugify from the claim with collision handling.
- **Rounds model:** a *claim* entity owning multiple argument-rounds; verdict history; rematch cadence + cooldown; dedup/merge on near-duplicate submit (extends the Arbiter / similar-fights path).
- **Topic hub pages** from domains + `content_keyword`; SSG/ISR pipeline; `schema.org` + OG/meta from the verdict.
- **Seed pipeline:** curated evergreen claim list → generate labeled, House-attributed, human-joinable live scaffolds.
- Search Console / analytics wiring.

---

## 12. Retention Layer 3 — Habit & Progression (Agreed Design, 2026-07-18)

*The last of the four retention layers — the one §8.3 explicitly parked here ("record is all-time for now; a seasonal ladder is deferred to the retention subsystem"). It closes hole #4 (§4, the logic ratchet) and resolves the §11.3 "rounds = seasons, same clock" interlock. Two mechanics were designed in this session and then **cut**, because the reasoning is load-bearing: a continuous score **decay** (the original "pinch of C") and a **streak** system — both recorded below as dead-ends.*

**In one line:** every number splits into a **seasonal race** (resets to 0 → fair for newcomers → drives the boards) and a **career monument** (grows forever, engraved), run off **one shared monthly heartbeat** that also gates §11.3's claim rematches. No decay, no streaks; season rewards are status-only and buy *influence*.

### 12.1 The season heartbeat — one clock, nested periods
- **Season = 4 weeks, global.** Everyone plays the same calendar, so "new season" is a shared, legible beat — a monthly re-engagement moment and a marketing peg.
- **One clock, two periods (resolves §11.3).** The user ladder and claim rematches want *opposite* things from a clock: the ladder wants a frequent shared reset, rematches want staggered, infrequent, non-spammy reopenings. So "same clock" means **same heartbeat, different periods** — the ladder ticks **every** season; a claim is eligible to re-run **at most once per ~quarter** (≈3 seasons), and only when heat/demand justifies it (reuses §9.2's graduation machinery). Reopenings sprinkle across the calendar instead of dumping at the boundary, so §11's staggered-freshness need survives.
- Both periods are tunable; 4 weeks / quarterly is the strawman.

### 12.2 The four-number model — seasonal race + career monument (the spine)
The layer rests on one move: **split every axis into a live seasonal slice and a permanent career total, and run all competition on the slice.**

| Axis | Seasonal race — resets to 0 → drives a board | Career monument — monotonic, engraved |
|---|---|---|
| **Skill** (`logic`) | `logic` **earned this season** → Season board | all-time `logic_score` → tier B→M + Legends board |
| **Standing** (`record`) | **season LP** → division ladder | all-time **W–L** + trophy case |

- **This is how hole #4 dies.** The all-time `logic_score` stays exactly as today — monotonic, earned from comment quality (§4). We simply **stop ranking competition on it.** The board ranks *logic earned this season*, which every player starts at **0** each month — so an all-time pile no longer buys a leaderboard seat, and a hot newcomer races veterans on equal footing. Anti-ratchet **and** newcomer-fairness fall out of the same mechanic.
- **No decay.** Because competition moved off the all-time number, it never needs clawing back; career totals only grow, and freshness is entirely the seasonal slice's job. (This is what retired the "pinch of C": a continuous inactivity decay we specified — grace period, weekly %, floor at one tier below peak — then dropped as strictly worse than slicing.)
- **State it plainly:** with no decay, tiers (B→M) only climb — a tier now reads as **lifetime seniority/accomplishment** (everyone trends toward Master over the years), *not* live skill. "How sharp are you right now" lives on the Season board; the tier is a monument badge, deliberately.

### 12.3 The LP ladder — currency, divisions, soft reset
- **Climbing currency = weighted Ladder Points**, not raw W–L (which rewards win-*volume* — grind again). LP is derived from §8's record events, so it adds **no third grindable number** — it's just *standing, projected onto this season*. Illustrative weights (tunable): win **+100** · MVP **+50** · upset-from-behind **+100** (§9.3) · Main-Stage marquee **×1.5** · draw **+25** (§8.4) · losing-side standout **+15** (§8.3) · loss **−25** (a sting, not a wipe).
- **Divisions (LP thresholds):** **Circuit → Contender → Regional → National → Elite → Champion** — deliberately *not* the academic B/A/M grades of the skill axis. A "grade" reads as skill, a "division" reads as competitive standing: two vocabularies, no collision.
- **Soft placement reset:** finish in division *D* → start next season at the **floor of D−1** (drop one). Protects the climb you invested while making you re-earn the top — the anti-ratchet on the standing axis, without a punishing wipe-to-zero.
- Underneath, the all-time **W–L `record` never resets** — the permanent trophy the seasonal ladder rides on.

### 12.4 Two boards, two paths to status
- **Season board (primary):** ranks *logic earned this season* — the fair, habit-driving race anyone can win, reset monthly.
- **Legends board (secondary):** ranks all-time `logic_score` — the slow monument where lifetime greatness lives permanently. Two tabs, same page.
- **Two independent paths to status fall out of the model:** the Season board crowns the **sharpest arguer** (craft — you earn logic by commenting well, win *or* lose); the LP ladder crowns the **best competitor** (outcomes — you earn LP by winning matches). Top one without the other — different playstyles, both honoured.

### 12.5 The Season Finale & rewards — status-only, and they buy influence
- **The season concludes like a debate does** — §8's verdict thesis, fractal'd onto the ladder. Season-end is a *finale*, not just a reset.
- **Guardrail: rewards never touch `logic`/`record`/LP.** A material kicker (say a permanent logic bonus for Champion) would reintroduce hole #4 by the back door — seasonal grinding would inflate the skill number. All seasonal payoff lives in a separate **status layer:**
  1. **Permanent Hall of Fame** — each season enshrines every division's top plus the top logic-earners on an immutable, shareable Season page. Doubles as a §11.2 evergreen SEO artifact and a §9 re-engagement beat.
  2. **Trophy case** (profile) — a row of per-season division finishes + peak tier + career W–L, building a legible **career arc** and a shelf to keep filling ("beat last season").
  3. **Cosmetics by peak division** — an avatar frame + a distinctive **verdict-card style** (§8.6/§11 shareables; a Champion's cards look unmistakable).
- **Governance lever — standing buys *influence*, not just cosmetics.** Elite/Champion players carry **weighted votes in §9.2 curation** (which Undercard debates graduate, which claims re-run as rounds). Very Crux-native: being good earns you a say in what the community argues about next.

### 12.6 No decay, no streaks — where the daily pull lives
- **No decay** (§12.2), and **no streak system** — the latter designed in full (streak = a daily scored contribution, status-only rewards, a freeze token, spanning seasons) then **cut on taste grounds**: streak-guilt is a cheap hook that reads wrong in a product for thoughtful debaters, consistent with the project's no-gimmick instinct.
- **So nothing runs on a daily clock** — matches are 24–48h, seasons monthly. That's intentional: the **daily ritual is content cadence, not a mechanic.** §9.1 already ships a fresh **Debate of the Day** every day, and §10's digest routes you to "arenas needing your side" today. The habit is "come see today's debate / go supply a side," not "protect a flame."

### 12.7 Implementation consequences (build phase, not now)
- **Schema:** a timestamped **`logic_events` ledger** (so "logic earned this season" is a windowed sum and the all-time total is the full sum); a **`seasons`** table (boundaries + rollover state); **per-user season LP** + division thresholds; **Hall-of-Fame** records (per season, per board/division); the career **W–L `record`** already implied by §8.7.
- **Jobs:** a **season-rollover job** on the 4-week heartbeat — snapshot the finale + Hall of Fame, grant cosmetics, soft-reset LP to the D−1 floor, zero the seasonal-logic window, and open the batch of quarter-eligible claim rematches (§11.3) staggered by heat.
- **Queries:** Season board (windowed logic sum), Legends board (all-time), the LP division ladder, and the governance vote-weight-by-division read for §9.2.
- **Reuses:** §9.2 graduation machinery for staggered rematch reopening; the §8.6 OG-card technique for finale/cosmetic verdict-card styling; §10 hooks for season-boundary + finale notifications.

---

## 13. Live Video Arena — Premiere v1 (Agreed Design, 2026-07-18)

*The last subsystem — §6's third gap, the "live video-streaming debate arena with a speaking TTS judge." Designed at product level in a browser visual-companion session (arena + cockpit mockups persist in `.superpowers/brainstorm/`). The key reframe: the full synchronous vision is **deliberately scoped down for v1** into a produced, hand-curated event that ships as a **marketing showcase** — the one piece intentionally **standalone** from the §8–12 async economy — with a clear path to the bigger vision.*

**In one line:** a Crux **premiere** is a hand-curated, recorded-then-scheduled **video debate** — two dev-picked opponents argue one claim across **five domain-lens rounds**, an AI judge (local STT → LLM → TTS) rules each round aloud and delivers a spoken closing verdict — published as a watchable VOD + a shareable verdict card to **market the platform**, not to feed the ladder.

### 13.1 Positioning & the evolutionary spine
- **Standalone marketing showcase, not a ranked mode.** For v1 the arena does **not** touch `logic`/`record`/LP/seasons and mints no ranked page. Its job is *acquisition*: a premium, human, AI-judged spectacle whose VODs and share-cards pull people in. It's a **§11 growth artifact**, decoupled from the §12 game.
- **One principle underneath it all: ship manual and controlled, automate once proven.** Three axes evolve v1 → v2:
  1. **Container:** *premiere* (recorded → scheduled group watch) → **live-streamed**.
  2. **Host:** *human on-camera host + a control cockpit* → **AI host**.
  3. **Integration:** *standalone marketing* → **economy-integrated** (marquee LP, the ladder, a ranked page).
- The v2s arrive together as **"AI-host live"** — §6's vision at full strength. v1 proves the format cheaply first.

### 13.2 Curation, invite & cadence
- **The dev is the matchmaker — and that dissolves the hardest problem.** A synchronous format normally needs two committed people *in the same ten minutes*; at this cadence the dev simply hand-picks them from the async fights (watch statements/comments → find two users genuinely on opposite sides of one live claim → pair them).
- **Invite:** an emailed invitation to a scheduled video debate on the platform, at a fixed time.
- **Cadence:** rare and marquee — **~2–3 per week, ~30 min** each. Scarcity is the point.

### 13.3 The format — domain-lens rounds
- **~5 rounds; each round is a domain lens.** A round assigns a domain from the fixed 12; each debater argues, **from their committed side**, whether **pro or con weighs heavier in *that* domain** ("does this claim's pro case dominate in Health? in Economics? in Ethics?").
- **Sides are fixed across rounds** — the two keep the side they were chosen for (§8.5's commit-to-one-side, live).
- **Why it's novel:** not a generic debate — **one crux interrogated through N domain lenses**, reusing the taxonomy the app already has.

### 13.4 Scoring — the hybrid (§8's verdict, spoken)
- **Per round the AI delivers a spoken *domain ruling* with a margin** (which side weighs heavier, e.g. 60/40 — §8's probability split scoped to one domain) **plus a *craft read*** on each debater's delivery.
- **Match = best-of-5 rulings.** Cumulative margin + craft break ties; a **draw** is possible (2–2 + tie logic, per §8.4).
- **A "standout debater" honor** (the §8.3/§8.4 MVP echo) can go to the sharpest arguer **even in defeat** — skill honored apart from the substance outcome.
- **The capstone is the spoken closing verdict** — §8's Verdict Judge, finally given a *voice*. The literal realization of §6's "speaking TTS judge."

### 13.5 The AI pipeline & the premiere safety net
- **Pipeline:** a **local small STT model** transcribes speech → transcript feeds the **LLM API** (the judge) → the ruling is spoken via **TTS** onto the stage.
- **Because v1 is recorded, all AI calls auto-fire at round-end and the ruling is pre-staged.** When a round's timer hits zero the LLM call runs automatically on the accumulated transcript; the ruling waits, ready.
- **The host reviews before it's spoken — edit / approve / retry — off-air.** This is the safety net a recorded premiere buys and live mode gives up: a garbled STT or a weak ruling never reaches the audience. The single biggest reason premiere is the right v1.

### 13.6 The stage (Layout C — "talk-show row")
- **Three video tiles: the host anchors the center**, Pro left, Con right — a human, hosted feel over a sterile face-off.
- **The AI judge is a quiet side-card during rounds that takes over the full screen to deliver each ruling** — the drama beat. Its voice + the takeover *is* the payoff; it needs no video tile.
- A **scoreboard strip** carries current domain, round (3/5), running score; a **premiere chat** rail carries the audience.

### 13.7 The host cockpit (host-only, overlaid on the host view)
The pre-defined match runs itself; the host just drives it. Zones:
- **Match header** — round stepper + current domain + running score.
- **Timer — auto-segments with a manual override.** Segments advance themselves (Pro 90s → Con 90s → rebuttals → ⚡ judge); the host can **pause/resume**, +15s, or skip.
- **AI Judge** — the **auto-staged ruling** with **edit / approve / retry**, then *approve & speak (TTS)*.
- **Round flow** — the 5 pre-defined domains as a stepper; *end round → next domain*.
- **Participants — two independent switches per person: audio (mute) and transcript-→-judge (pause).** The sharp bit: keep an off-topic debater **audible on stage but excluded from the judge's input** — natural human flow, clean judge signal.
- **Live transcript** — the STT feed (exactly what the judge will read), paused speakers struck out.

### 13.8 Marketing surfaces — the deliverables
- **A "Past Video Debates" tab on the home page** — playable VOD cards (thumbnail + ▶, the claim, the two debaters, winner + score, duration).
- **A shareable verdict card per debate** — the acquisition unit, the **§8.6 verdict-card technique pointed at video**: claim, both faces, round-win pips, winner + margin, the AI's one-line verdict, per-domain split chips, canonical link home. Built to travel on social and click back.

### 13.9 Implementation consequences (build phase, not now)
- **Real-time A/V:** a 3-way video room (WebRTC or a hosted SDK) + a recording pipeline for the VOD.
- **AI:** a local streaming STT model (per-speaker, **pausable**); LLM judge calls (per-round domain ruling + margin + craft, and the closing verdict — reuse §8's Verdict-Judge prompt, domain-scoped); TTS playback to the stage.
- **Host cockpit:** a match-runner **state machine** (segments, auto-timer, round stepper), per-speaker transcript gating, the ruling **preview → edit/approve/retry → TTS** flow, spotlight/mute.
- **Storage & surfaces:** VOD hosting; a `video_debates` record (claim, debaters, per-round rulings, winner, margin, verdict text, VOD URL); the share-card generator (reuse the §8.6 OG technique); the home-page tab + a public VOD/card page (good for §11, even though it's ladder-standalone).
- **Explicitly NOT wired:** no writes to `logic`/`record`/LP/`seasons`; no ranked concluded page. That coupling is the **v2** ("AI-host live").

---

*The doc now covers the whole product (§0–13). Everything from §8 on is design, not build — each section carries its own "implementation consequences." The video arena's v2 (live-streaming + AI host + economy-integration) is the one deliberately deferred frontier.*
