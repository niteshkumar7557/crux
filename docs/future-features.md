# Crux — Future Features

Designs that are **finished thinking but deliberately out of v1**. Nothing here is half-baked;
each was worked through and then cut to keep v1 small enough to launch, explain, and maintain.

**How to use this file:** when a feature earns its way in — because real users asked, or a real
metric demands it — the design is already here. Move it into
[`game-theory.md`](./game-theory.md) and build it. Until then it stays out of the product and
out of the pitch.

**The ordering below is roughly the order these should be considered**, not a roadmap.

---

## 1. Live Video Arena

**The biggest one, and the one worth building next once v1 has an audience.**

A Crux **premiere** is a hand-curated, recorded-then-scheduled **video debate**: two picked
opponents argue one claim across five rounds, an AI judge rules each round *aloud*, and it ends
with a spoken closing verdict. Published as a watchable VOD plus a share card.

### Positioning

This is a **marketing showcase, not a ranked mode.** It does not touch logic, records, or
seasons, and it mints no ranked page. Its job is acquisition — a premium, human, AI-judged
spectacle whose recordings and share cards pull people toward the async game.

One principle underneath the whole design: **ship manual and controlled, automate once proven.**
Three axes evolve from v1 to v2:

| Axis | First version | Later |
|---|---|---|
| Container | Recorded, then scheduled as a group premiere | Live-streamed |
| Host | A human on camera, with a control cockpit | An AI host |
| Integration | Standalone marketing | Wired into the season economy |

The later versions arrive together as **"AI-host live"** — the full original vision. The
premiere format proves the format cheaply first.

### Curation and cadence

**The dev is the matchmaker, and that dissolves the hardest problem.** A synchronous format
normally needs two committed people in the same ten minutes. At this cadence you simply
hand-pick them out of the async fights — watch the live debates, find two users genuinely on
opposite sides of one claim, and invite them by email to a scheduled slot.

**Cadence: rare and marquee — roughly 2–3 per week, ~30 minutes each.** Scarcity is the point.

### Format — domain-lens rounds

**Five rounds; each round is one domain lens.** A round assigns a domain from the fixed 12, and
each debater argues — **from their committed side** — whether the pro or con case weighs heavier
*in that domain*. Does this claim's pro case dominate in Health? In Economics? In Ethics?

Sides are fixed across all five rounds; the side lock, live.

**Why this is novel:** it isn't a generic debate. It's **one crux interrogated through five
different lenses**, reusing the domain taxonomy the app already has.

### Scoring

- **Per round**, the AI delivers a spoken **domain ruling with a margin** (which side weighs
  heavier in that domain, e.g. 60/40) **plus a craft read** on each debater's delivery.
- **The match is best-of-five rulings.** Cumulative margin and craft break ties. A draw is
  possible.
- **A standout-debater honour** can go to the sharpest arguer even in defeat — craft honoured
  separately from substance.
- **The capstone is the spoken closing verdict** — the verdict judge, finally given a voice.

### The AI pipeline, and why recorded comes first

A **local speech-to-text model** transcribes both speakers → the transcript feeds the **LLM
judge** → the ruling is spoken back onto the stage via **TTS**.

Because v1 is recorded, every AI call fires automatically at round end and the ruling waits,
pre-staged. **The host reviews it before it is ever spoken — edit, approve, or retry, off-air.**
That safety net is the single strongest argument for premiere over live: a garbled transcript or
a weak ruling never reaches the audience.

### The stage

Three video tiles in a talk-show row: **the host anchors the centre**, Pro left, Con right — a
hosted feel rather than a sterile face-off. The **AI judge is a quiet side-card during rounds
that takes over the full screen to deliver each ruling** — the drama beat. Its voice and that
takeover *are* the payoff; it needs no video tile of its own. A scoreboard strip carries the
current domain, the round (3/5), and the running score. A chat rail carries the audience.

### The host cockpit

Host-only, overlaid on the host's view. The match mostly runs itself; the host just drives it.

- **Match header** — round stepper, current domain, running score.
- **Timer** — auto-advancing segments (Pro 90s → Con 90s → rebuttals → judge) with manual
  pause/resume, +15s, and skip.
- **AI judge** — the auto-staged ruling with edit / approve / retry, then *approve and speak*.
- **Round flow** — the five pre-defined domains as a stepper.
- **Participants** — two independent switches per person: **audio (mute)** and
  **transcript-to-judge (pause)**. The sharp bit: you can keep an off-topic debater *audible on
  stage* but *excluded from the judge's input* — natural human flow, clean judge signal.
- **Live transcript** — exactly what the judge will read, with paused speakers struck out.

### Deliverables

- **A "Past Video Debates" tab** on the home page — playable VOD cards with thumbnail, the
  claim, both debaters, the winner and score, and duration.
- **A share card per video debate** — claim, both faces, round-win pips, winner and margin, the
  AI's one-line verdict, per-domain split chips, and a link home.

### What it needs

A 3-way video room (WebRTC or a hosted SDK) and a recording pipeline; a local streaming STT
model with per-speaker pausing; LLM judge calls per round plus the closing; TTS playback; a
match-runner state machine for the cockpit; VOD hosting; a `video_debates` record; the share-card
generator; the home tab and a public VOD page.

**Explicitly not wired:** no writes to logic, records, or seasons. That coupling is the v2.

**Why it's deferred:** it is more work than everything in v1 combined, and it markets a product
that has to exist and be good first. Build it when there is an audience worth premiering to.

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
*not* the academic B/A/M grades — a "grade" reads as skill, a "division" reads as competitive
standing. Two vocabularies, no collision.

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

## 5. The AI-written profile blurb

§9 of the spec describes "an AI-written blurb describing how you think, inferred from the
statements you open and the arguments you make." It is the one identity feature v1 does not
build.

**Why it's deferred:** §12 fixes the AI at five personas, each with one job, and none of them
writes profile copy. A blurb needs a sixth persona, a prompt, a regeneration trigger (on a
comment-count threshold, or a background job), and a decision about what happens when the user
disagrees with what it says about them. v1 ships an editable bio instead — one endpoint, no LLM
cost, and it replaces the dead default text ("Post some Statements to get to know about you.")
that most profiles show today.

**The shape if it's built:** generate on a threshold rather than per comment (it is expensive and
changes slowly), keep the user's manual override winning over the generated text, and show which
one is being displayed. A profile that silently rewrites itself is unsettling; one that offers to
is a feature.

---

## 6. Governance — standing buys influence

Top-division players carry **weighted votes on curation**: which debates get promoted to the
Main Stage, and which claims re-run as rounds. Very Crux-native — being good at arguing earns you
a say in what the community argues about next.

Depends on both the division ladder (§3) and community voting (§8).

---

## 7. Underdog multiplier and upset bonus

Within-debate liquidity: concentration fills *debates*, this fills *sides*.

- **Scarce-side multiplier** — a comment on the trailing side (strictly fewer comments) earns
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

A live debate with high comment velocity in its final two hours gets one automatic extension
(+6h), so a genuine late swing isn't cut off mid-argument.

**Why it's deferred:** v1's fixed 48h clock is a promise — "this closes tomorrow at 6pm" is
something a user can plan around. A variable clock is something they have to keep checking. If
debates really do die mid-swing, revisit.

---

## 11. Email and digests

v1 ships in-app notifications only. The full design:

- **Real-time email** for the personal, rare, actionable events (you were rebutted; your debate
  got its first opponent; your debate closes in 2h; the verdict is in).
- **A daily or weekly digest** for the ambient habit anchor: the Debate of the Day, debates
  needing your side, your rank movement, debates you're in that concluded.
- **An anti-annoyance budget:** a hard cap on real-time sends per user per day, overflow batched
  into the digest, per-category unsubscribe, and every link deep-linking to a live payoff.
- Web push, later still.

Email is the reactivation workhorse and addresses are already stored — this is the highest-value
item in this file after the video arena.

**The golden rule to keep if this is built:** every notification must lead to a **live** arena. A
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
month. The daily ritual is **content cadence, not a mechanic**: the Debate of the Day is fresh
every morning. The habit is "come see today's debate," not "protect a flame."
