# Crux — Future Features

Designs that are **finished thinking but deliberately out of v1**. Nothing here is half-baked;
each was worked through and then cut to keep v1 small enough to launch, explain, and maintain.

**How to use this file:** when a feature earns its way in — because real users asked, or a real
metric demands it — the design is already here. Move it into
[`game-theory.md`](./game-theory.md) and build it. Until then it stays out of the product and
out of the pitch. Section references like §13 point at the spec unless they name this file.

**The ordering below is roughly the order these should be considered**, not a roadmap.

---

## 1. Live Video Arena

The earlier live-premiere concept has been superseded by the approved design in
[`video-debate-design.md`](./video-debate-design.md).

The first version is a separately authored, on-demand editorial programme: one host and two
debaters argue five domain-lens rounds in at most ten minutes. Three synchronized MP4s are
recorded and processed locally; the host track carries the playback mix, and isolated audio feeds
local Whisper transcription. A dedicated local AI pipeline rules every round, while the website
reveals transcript, cited points and rulings progressively from the shared playhead.

It remains deliberately outside the ranked game: no arena-motion link and no writes to logic,
records, seasons or leaderboards. Railway owns metadata and APIs only; Cloudflare R2 delivers the
video directly.

Live broadcasting, an AI host, a spoken judge and ranked integration remain possible later, but
none is an architectural requirement for this version.

---

## 2. Rounds and rematch

A concluded debate is a dead end unless it leads somewhere joinable.

**The design:** a *claim* becomes an entity that owns multiple **rounds**. Round 1 concludes with
its verdict preserved; later, a fresh live Round 2 opens **on the same URL** for newcomers to
join. Past rounds' verdicts and MVPs stay visible on the page.

**Dedup becomes a feature.** Near-duplicate claims **merge into rounds of one canonical debate**
instead of splitting into competing dead pages. One strong URL per claim, gaining authority over
time, instead of five weak ones.

**Cadence:** a claim is eligible to re-run at most once per quarter, and only when demand
justifies it — so a rematch is a deliberate event, not spam, and reopenings sprinkle across the
calendar rather than dumping at a season boundary.

**Why it's deferred:** it requires restructuring the core data model around a claim entity, and
it only pays off once there are enough concluded debates for a rematch to be interesting.

---

## 3. The division ladder

A second competitive axis measuring **outcomes** rather than craft.

**Ladder Points**, derived from concluded results rather than raw W–L (which just rewards
volume): win +100, MVP +50, upset-from-behind +100, main-stage marquee ×1.5, draw +25,
losing-side standout +15, loss −25.

**Divisions by LP:** Circuit → Contender → Regional → National → Elite → Champion. Deliberately
distinct from the §13 tier names (Beginner → Master) — a "tier" reads as accumulated skill, a
"division" reads as current competitive standing. Two vocabularies, no collision. Note the
name clash to resolve if this is ever built: "Contender" is already a season title (§14).

**Soft placement reset:** finish in division D → start the next season at the floor of D−1. It
protects the climb you invested while making you re-earn the top.

The point of the whole thing is **two independent paths to status**: the logic board crowns the
sharpest arguer (craft — you earn logic whether you win or lose), the ladder crowns the best
competitor (outcomes). Top one without the other; different playstyles, both honoured.

**Why it's deferred:** v1 has one number and one board, and that is a feature. A second parallel
progression system is the fastest way to make a simple product feel like homework.

---

## 4. Hall of Fame and cosmetics

- **Permanent season pages** enshrining every season's winners — immutable, shareable, and
  incidentally excellent evergreen SEO.
- **A trophy case** on the profile: a row of per-season finishes, peak tier, and career record,
  building a legible career arc.
- **Cosmetics by achievement** — beyond the top-3 frames: distinctive verdict-card styles so a
  champion's shared cards are unmistakable.

**Guardrail to preserve if this is ever built:** season rewards must never touch logic or the
record. A material reward — say, a permanent logic bonus for winning a season — would reintroduce
the grind problem through the back door. **All seasonal payoff stays status-only.**

---

## 5. Bio ownership — the manual override

**This one is a fix, not a feature, and it is the highest-priority item in this file.**

Today the profile bio has two writers and no arbitration. The Debater Profiler (§16, persona 6)
rewrites `users.description` from your recent motions every time you publish one, and the bio
editor writes the same column by hand. So **posting a motion silently destroys a bio you wrote
yourself** — the user sees their own words replaced by a machine's, with no warning and no way to
keep them.

**The shape of the fix:**

- **Store the two separately** — a generated blurb and a manual bio, in different columns.
- **The manual one always wins when it exists.** A profile that silently rewrites itself is
  unsettling; one that *offers* to is a feature.
- **Show which one is displayed**, with a one-tap way to switch or to regenerate.
- **Generate on a threshold**, not on every motion: the sketch is expensive and changes slowly.

Until then, treat the generated blurb as the default state and the editor as a temporary override
that the next motion will overwrite. It is recorded as a known gap in
[`codebase-guide.md`](./codebase-guide.md).

---

## 6. Governance — standing buys influence

Top-division players carry **weighted votes on curation**: which debates get promoted to the
Main Stage, and which claims re-run as rounds. Very Crux-native — being good at arguing earns you
a say in what the community argues about next.

Depends on both the division ladder (section 3 of this file) and community voting (section 8).

---

## 7. Underdog multiplier and upset bonus

Within-debate liquidity: concentration fills *debates*, this fills *sides*.

- **Scarce-side multiplier** — an argument on the trailing side (strictly fewer arguments) earns
  **1.5×** logic. Surge-pricing the side nobody wants.
- **Upset bonus** — winning from behind (a side whose forecast dropped to ≤40 and still won) gets
  flagged as a marquee record achievement. Anti-bandwagon, and very shareable: *"won 60–40 from a
  side that was losing 30–70."*

Gaming is contained by the side lock — you commit to the underdog deliberately and can't flip to
farm the multiplier.

**Why it's deferred:** it fights a real problem, but it's one more asterisk on v1's clean scoring
rule. Add it if empty sides turn out to be the actual bottleneck.

---

## 8. Community upvotes on the stage

Users upvote live debates toward the Main Stage; votes fold into the featuring rank alongside
heat and the admin pin. The honest cold-start-to-scale path is editorial-heavy first (you can
hand-pick, and it sets the tone), then heat and votes take over as real signal appears.

**Why it's deferred:** upvotes are meaningless without a crowd, and v1's heat-plus-pin already
covers both ends of that path.

---

## 9. Losing-side standout

The verdict judge names the sharpest debater **on the losing side** of a decisive match — never
the MVP — for a small bonus and a "stood out in defeat" mention. Anti-bandwagon: it says craft is
honoured even when your side loses.

**Why it's deferred:** v1's verdict already has enough moving parts, and "MVP comes from the
winning side" is a rule that fits in one sentence.

---

## 10. Hot extension

A live debate with high argument velocity in its final two hours gets one automatic extension
(+6h), so a genuine late swing isn't cut off mid-argument.

**Why it's deferred:** v1's fixed 48h clock is a promise — "this closes tomorrow at 6pm" is
something a user can plan around. A variable clock is something they have to keep checking. If
debates really do die mid-swing, revisit.

---

## 11. Email and digests — ~~deferred~~ **partly built, 2026-08**

**The real-time half of this shipped. It lives in [`game-theory.md`](./game-theory.md) §20 now,
and that section is the source of truth — not this one.** What shipped: real-time email over
Amazon SES for the verdict, a reply, a new opponent, a season placement and a welcome, plus an
operator announcement about a single motion; a per-category unsubscribe with one-click; permanent
suppression on hard bounce and complaint; and the anti-annoyance budget, as a hard ration of 4
sends per user per 24 hours across the two high-frequency categories.

**What is still deferred, and why:**

- **The digest**, daily or weekly — the Motion of the Day, debates needing your side, your rank
  movement, debates you're in that concluded. It was cut because it is the expensive half: a fifth
  set of queries, a send window, and a second editorial voice to maintain. Without it, email that
  exceeds the ration is **dropped rather than batched**, which is the honest trade and is stated
  as such in §20. **If the drop rate turns out to be high, that is the trigger to build this.**
- **The walkover warning email** — "6 hours left and nobody has argued against you". Designed,
  and deliberately not in the first cut: the in-app banner already covers the case, and it needed
  a poller pass of its own.
- **Web push.** Untouched.

**The golden rule, which §20 now carries:** every notification must lead to a **live** arena. A
ping that lands someone in a dead room makes churn worse, not better.

---

## 12. AI House backstop

An AI opponent that fills an empty side so a featured debate doesn't walk over.

**Deliberately off by default** to protect the human-versus-human ideal — the whole moat is that
real people actually argued. Available as an emergency floor only if a featured debate is about
to die unopposed, and it would have to be clearly labelled as the House.

---

## 13. Direct challenges

Call out a specific opponent: *"defend the other side of this → [link]."* It's really a viral
invite loop wearing a liquidity costume — it accelerates growth but doesn't originate it.

---

## 14. Seeded evergreen debates

Seed a curated base of evergreen claims (targeting real search demand) as **live** debates: the
AI writes both cases, and they're open for humans to join and conclude.

**The honesty rule that makes this safe: a seed is a live scaffold, never a fake-concluded page.**
Clearly labelled as opened by the House, indexable immediately, and it earns a *real* verdict once
humans argue. No fabricated users, no fabricated verdicts.

Prefer timeless claims — ethics, philosophy, policy perennials — over news. Evergreen compounds;
news decays.

---

## Dead ends — designed, then deliberately cut

**Do not re-propose these.** Both were worked through in full and rejected for reasons that still
hold. They're recorded so the reasoning isn't lost and the argument doesn't get re-run.

### Score decay

A continuous inactivity decay on the logic score — a grace period, a weekly percentage, a floor
one tier below your peak — intended to stop the score being a pure ratchet.

**Why it was cut:** the seasonal window solves the same problem better. Once competition moved off
the all-time number and onto "logic earned this month," the all-time number never needs clawing
back. Decay is strictly worse: it punishes absence instead of rewarding presence, and it makes
taking a month off feel like a penalty.

**The consequence to state plainly:** with no decay, tiers only ever climb, so a tier reads as
**lifetime accomplishment**, not current skill. Everyone trends toward Master over the years, and
that's fine — "how sharp are you right now" is what the season board is for. The tier is a
monument badge, deliberately.

### Streaks

A daily-contribution streak with status-only rewards and a freeze token, spanning seasons.

**Why it was cut:** on taste. Streak-guilt is a cheap hook and it reads wrong in a product for
thoughtful people — the mechanic actively rewards showing up over having something to say.

**And it leaves nothing on a daily clock, which is intentional.** Debates run 48h, seasons run a
month. The daily ritual is **content cadence, not a mechanic**: the Motion of the Day is fresh
every morning. The habit is "come see today's debate," not "protect a flame."
