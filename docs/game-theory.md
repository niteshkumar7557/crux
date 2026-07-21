# Crux — Game Theory (v1)

**Crux is a debate platform where every argument ends.** You post a claim, two camps form,
you argue for 48 hours, and then a neutral AI judge rules — a winner, a margin, an MVP, and a
written verdict. Your reasoning earns you a score. Every month the board resets so anyone can win it.

This document is the **complete rules of the game**. It is product design, not a build log —
it describes v1 as it should exist, from zero. Anything designed and deliberately deferred
lives in [`future-features.md`](./future-features.md).

> **Companion docs:** [`README.md`](../README.md) for setup · [`CODEBASE_GUIDE.md`](./CODEBASE_GUIDE.md)
> for how the code is organised. This file is the *why*.

---

## 0. The pitch — what v1 is, in one table

This is the answer to "so what does it actually do?" Every row is a feature, what it does, and
why a user cares.

| Feature | What it is | Why a user cares |
|---|---|---|
| **AI-gated statements** | An AI referee reads your claim before it goes live and rejects vague or unarguable ones, suggesting a sharper rewrite | You never walk into a debate that was doomed by a bad question |
| **Two-sided arena** | Every debate has exactly two camps — FOR and AGAINST — each with a live AI-written case | You always know what you're up against, and what your side's best argument currently is |
| **48-hour clock** | Every debate ends. No perpetual threads | Your effort resolves. There's a payoff moment, and a reason to come back |
| **Side lock** | Your first comment commits you to one side for that debate | Nobody can hedge both sides to guarantee a win. The two camps are real |
| **Direct replies** | You reply to a specific comment on the opposing side, and that reply earns the most points | Being *right at* someone is worth more than talking past them. This is what makes it a debate |
| **Logic score** | An AI scores every contribution 1–8 on how well it engages the actual argument | Your reputation is earned by reasoning, not by follower count or upvotes |
| **The verdict** | At 48h an AI judge names a winner, a margin, an MVP, and writes why | An unbiased conclusion — the thing normal internet arguments never produce |
| **W–L–D record** | Permanent win/loss/draw record on your profile | A career. Proof you argue well, not just often |
| **Monthly seasons** | The board tracks logic earned *this month* and resets on the 1st | A newcomer can top the board in week one. Nobody is locked out by a veteran's pile of points |
| **Season titles** | The top 3 each month earn a permanent title and avatar frame | Something to keep, forever, that says you won a month |
| **Main Stage + Debate of the Day** | The best live debates get concentrated on one stage | You never land on a dead debate with nobody to argue against |
| **Verdict share card** | Concluded debates generate a share image — claim, winner, margin, MVP | Your win travels. It's the thing you paste in a group chat |

---

## 1. Vocabulary — pinned down

These words are used precisely throughout the product and the code. Fix them now.

| Word | Meaning |
|---|---|
| **Statement** | The claim being argued — one bold declarative sentence submitted by a user |
| **Debate** (or **arena**) | The container built around one statement: its two cases, its comments, its clock, its verdict. One statement → one debate |
| **Side** | `FOR` or `AGAINST`. There are exactly two |
| **Case** | The AI-maintained running summary of one side's position. Rewritten as new comments land |
| **Comment** | One user's contribution to one side. The atomic unit of arguing |
| **Reply** | A comment that targets a specific comment on the **opposing** side |
| **Verdict** | The AI judge's closing ruling: winner, margin, MVP, and a written explanation |
| **Logic** | The single skill score. Earned by arguing well |
| **Record** | Your permanent W–L–D from concluded debates |
| **Season** | One calendar month of competition |

---

## 2. The loop

```
  POSTING                                 ARGUING
  ───────                                 ───────
  1. Write a claim, pick a domain      4. Read both cases + the live split.
     (or AUTO).                            Pick a side.
         │                                     │
         ▼                                     ▼
  2. ARBITER (AI) judges it.           5. Your FIRST comment LOCKS your side
     Fail → the reason + a sharper        for this debate. Confirmed up front.
     rewrite to try instead.                  │
         │  (on pass)                         ▼
         ▼                              6. Comment — standalone, or REPLY to a
  3. OPENING ANALYST (AI) writes           specific opposing comment.
     the strongest FOR case and               │
     AGAINST case. The 48h clock              ▼
     starts. The arena is live.        7. ANALYST (AI) screens for abuse, scores
         │                                you 1–8, and rewrites your side's case.
         │                                    │
         │                                    ▼
         │                             8. You see exactly what you earned and why.
         │                                    │
         │                                    ▼
         │                             9. PROBABILITY JUDGE updates the live split
         │                                (once both sides have argued).
         │                                    │
         └──────────► arena ◄────────────────┘
                        │
                        ▼  at 48:00:00
              10. Arena LOCKS read-only.
                  VERDICT JUDGE rules.
                  Payouts land. Records update.
                  Share card is generated.
```

---

## 3. The clock

- Every debate runs **exactly 48 hours** from the moment it goes live. No extensions, no
  early closes.
- The countdown is visible everywhere the debate appears — in the arena and on every card.
- At zero the arena **locks read-only**: no new comments, no new replies, no likes. It stays
  permanently readable.
- The verdict fires immediately on lock.

**Why a fixed clock:** it makes the deadline a shared, predictable event. "This closes tomorrow
at 6pm" is something a user can plan around; a variable clock is something they have to check.

---

## 4. Sides and the lock

- Every debate has exactly two sides: **FOR** and **AGAINST**.
- **Your first comment locks your side for that debate.** You cannot argue the other side of
  the same debate afterwards. The lock is per-debate — you're free to take FOR in one debate
  and AGAINST in the next.
- The lock is confirmed **before** it happens, never discovered after (see §14).
- The statement's author is a normal participant: they can argue, and they get locked like
  anyone else.

**Why:** without a lock, the optimal strategy is to comment on both sides and be guaranteed a
win. The lock is what makes the two camps real, and what makes a verdict mean something.

---

## 5. Comments and replies

Two ways to contribute:

**Standalone comment** — you make a point on your side. It goes in your side's column.

**Reply** — you pick a specific comment on the **opposing** side and answer it directly. Your
reply still lives in **your own side's column** (side integrity is never broken), carrying a
compact quote of what it answers. The comment you replied to shows a `↳ N replies` counter.

```
FOR                        AGAINST
┌───────────────────────┐  ┌───────────────────────┐
│ @maya            +7   │  │ @arjun           +6   │
│ Nuclear is the only   │  │ Build time alone kills│
│ baseload that scales. │  │ it — 12 yrs a plant.  │
│              ↳ 1 reply│  │                       │
└───────────────────────┘  └───────────────────────┘
                           ┌───────────────────────┐
                           │ @dev             +8   │
                           │ ┌─replying to @maya─┐ │
                           │ │"the only baseload"│ │
                           │ └───────────────────┘ │
                           │ Hydro and geothermal  │
                           │ are both baseload...  │
                           └───────────────────────┘
```

**Rules:**
- **Cross-side only.** You cannot reply to your own side. A reply is by definition a rebuttal.
- **Chains form naturally.** A reply is itself a comment on a side, so the other camp can reply
  back to it. Real exchanges emerge.
- **Many-to-one is fine.** Several people can reply to the same comment.
- **Replying sets your side lock** if you haven't commented yet — you're committing to the side
  opposite the comment you're answering.
- Replies do not create a separate thread view. The two columns stay chronological; the
  quote stub and the counter carry the connection.

**Why replies are the centre of the design:** a reply makes "did you engage a real opponent?" a
fact in the data, not something an AI has to infer. That is the single strongest defence
against pasted AI text (§13), and it's also what turns parallel monologues into a debate.

---

## 6. Scoring — the logic score

**Logic is the only skill number.** It starts at 0 and is earned by arguing.

| Action | Logic |
|---|---|
| **Reply** to a specific opposing comment | **1–8**, judged by the AI. A sharp, targeted rebuttal earns 7–8 |
| **Standalone** comment | **1–8 judged, then capped at 5.** It engages nothing specific |
| Standalone when **the opposing side is still empty** | **1–8, uncapped.** There was nothing to reply to yet |
| Your **4th and later** comment in one debate | **halved** (floor 1), after all other rules |
| Someone **likes** your comment | **+2** to you |
| Your comment is flagged as **abuse** | **−4**, and the comment is discarded |

**Order of operations** — score the comment 1–8 → apply the standalone cap → apply the
halving → award. The user is shown this breakdown every time (§14).

**What the AI is actually judging** — not eloquence, not length, and not whether it agrees.
It scores how much the comment *moves the argument*: does it answer a specific point, does it
introduce something the case doesn't already contain, does it hold up. A well-written paragraph
that ignores everything already said scores low on purpose.

---

## 7. The verdict

At lock, the **Verdict Judge** reads the statement, both final cases, every comment, and the
reply structure, then returns: `{ for%, against%, winner, mvp, closing }`.

- **Margin = |for% − against%|.**
- **Margin > 5 → that side wins.** (58–42 is a 16-point margin: FOR wins.)
- **Margin ≤ 5 → draw.** (52–48 is a 4-point margin: draw.)
- **MVP** is the single best debater **on the winning side**. There is no MVP on a draw —
  there is no winning side to take one from.
- **Closing** is a short written explanation naming the crux and why it resolved that way.
  This is the capstone the whole 48 hours is building toward, and the text on the share card.

**Walkover** — if one side has **zero** comments at lock, the debate concludes "unopposed."
**Nobody scores anything** — no logic, no W/L/D, not even the author bonus. You cannot win a
contest nobody entered, and this closes the obvious exploit of posting a statement and
farming an uncontested win.

---

## 8. Payouts

| Who | Logic | Record |
|---|---|---|
| **MVP** (winning side) | **+25** | +1 W, MVP badge |
| Winning side, everyone else | **+10** | +1 W |
| Losing side | **−5 to your season score only.** Your all-time logic never falls | +1 L |
| Both sides, on a draw | 0 | +1 D |
| Statement author, on a decisive or drawn conclusion | **+5** | — |
| Anyone, on a walkover | 0 | — |

The MVP's +25 **replaces** the +10; it does not stack.

**How the season-only penalty works:** logic is recorded as a timestamped ledger of events, so
"logic earned this season" is a sum over the current month while the all-time score is the
running total. A loss writes a **−5 ledger event that is excluded from the all-time total** —
it drags your season board position down and leaves `logic_score` untouched. One number, two
readings.

**Why the loss penalty is season-only:** losing should cost you the race, not your career.
A permanent deduction would make people avoid the unpopular side of every debate — which is
exactly the problem a young platform cannot afford. This way a loss is a real setback in the
month you're competing in, and invisible on the record of who you are.

### Worked example

Maya opens FOR while AGAINST is still empty (+7 uncapped), replies to an opponent (+6), then
posts a standalone (judged 6, capped to 5). **In-match: +18.**

The debate closes **FOR 58 – AGAINST 42**. Margin 16 > 5, so FOR wins, and Maya is MVP.

- **Maya:** 18 + 25 = **+43 logic**, +1 W, MVP badge.
- **Dev**, who argued AGAINST across three comments (+16): keeps **16 all-time**, but his
  **season** total for those comments is 11 after the −5. +1 L.
- **Sam**, who posted the statement and argued FOR (+12): 12 + 10 (win) + 5 (author) = **+27**, +1 W.

Read the gradient: **arguing** is the base income, **winning** is worth about half a debate's
work, and **MVP** is worth more than the arguing itself. Losing still leaves you well ahead of
not showing up. **Nobody should ever regret participating** — that is the property these
numbers exist to protect.

---

## 9. Your record and identity

A profile carries:

- **Logic score** — all-time, monotonic. Never falls.
- **Record** — `W – L – D`, all-time, from concluded debates.
- **MVP count** — all-time.
- **Tier** — a coarse badge derived from all-time logic. Progress you can feel long before you
  are anywhere near a leaderboard.

| Logic | Tier | Grade |
|---|---|---|
| 0–49 | Beginner | B |
| 50–99 | Intermediate | B+ |
| 100–149 | Skilled | A |
| 150–199 | Expert | A+ |
| 200+ | Master | M |

- **Season titles and avatar frames** — permanent, stacking (§10).
- **An AI-written blurb** describing how you think, inferred from the statements you open and
  the arguments you make.

---

## 10. Seasons

- **A season is one calendar month, UTC.** Season 0 is the launch month; Season 1 is the
  following month, and so on.
- **The Season board** ranks users by **logic earned during this month**. Everyone starts each
  month at 0.
- **The Legends board** ranks users by **all-time logic**, and never resets. Two tabs, one page.
- Your all-time logic is *not* affected by the reset — only the board's window is.

**Why the reset is the whole point:** if the board ranked all-time logic, a user who joined in
month one would sit on top forever and everyone who arrives later is playing for second place.
Ranking the month means **the current board is always winnable**, by anyone, from zero. It also
means the number that measures "how sharp are you right now" is separate from the number that
measures "what have you built over your career."

### Season end

At the month boundary, a rollover job:

1. **Snapshots the final Season board.**
2. **Awards the top 3** a permanent title and avatar frame:

   | Rank | Title | Frame |
   |---|---|---|
   | 1 | **Champion of Season N** | Gold |
   | 2 | **Challenger of Season N** | Silver |
   | 3 | **Contender of Season N** | Bronze |

3. Titles and frames are **permanent and stacking** — a profile displays every one ever earned.
   They are the only reward that survives a season, and they are **status only**: they grant no
   logic, no advantage, and no special powers. A season's prize is proof you won a month.

Nothing else resets. There is no decay, no streak, and no penalty for taking a month off. The
season board simply describes a window of time.

---

## 11. The stage — how debates get found

The core problem for a young platform isn't too little content; it's attention spread so thin
that a thousand statements each get zero opponents. The fix is **concentration**.

- **Debate of the Day** — one live debate, crowned once per day, on the home hero slot.
- **Main Stage** — roughly 4 more featured live debates below it.
- **Everything else** stays fully browsable through Newest, the 12 domains, and search. Nothing
  is throttled or hidden — posting always works instantly and always goes live.

**How the stage is picked — heat plus a pin.**

**Heat** = comment velocity × side balance, computed on a short interval for every live debate.
A debate where both sides are genuinely contesting each other outranks a lopsided one with more
raw comments — a 50/50 fight at 10 comments an hour beats a 90/10 blowout at 20. Balance is
weighted deliberately: the stage should showcase *contests*, not pile-ons.

**The pin** — an admin (`users.role = 'admin'`) can pin any live debate onto the Main Stage or make it
the Debate of the Day. At launch, when there is barely enough volume for heat to mean anything,
pinning is how the stage gets its taste; as real volume arrives, heat takes over and pinning
becomes the exception. One mechanism that is honest on day one and still correct at scale.

Featured debates carry a visible **Main Stage** label and the Debate of the Day carries its own,
so nothing about placement is mysterious.

---

## 12. The AI — five personas

Every AI call is a distinct persona with its own prompt and its own job. Naming them separately
matters: features attach to specific personas, and a change to one should never silently
change another.

| # | Persona | Fires when | Decides |
|---|---|---|---|
| 1 | **Arbiter** | A statement is submitted | Pass or fail, the reason, a sharper rewrite, the keyword, the domain |
| 2 | **Opening Analyst** | A statement passes | The strongest opening FOR case and AGAINST case |
| 3 | **Analyst / Moderator** | Every comment | Abuse screen → a 1–8 score → a rewrite of that side's running case, crediting the commenter |
| 4 | **Probability Judge** | Every comment, once both sides have argued | The live win split, judged on the two cases |
| 5 | **Verdict Judge** | At lock | Winner, margin, MVP, and the written closing |

When a comment is a **reply**, persona 3 is additionally given the exact comment being answered,
and scores the rebuttal against it. When it's standalone, it only sees the opposing side's case
— and the score is capped at 5. That difference in what the AI is shown is precisely what makes
replies worth more.

The probability judge scores **the two synthesised cases**, not comment counts or votes. Being
loud does not move the bar; being right does.

---

## 13. Integrity — how the game stays honest

Three structural facts, not three detectors.

**1. You must reply to score high.** A language model can write a polished, general essay about
any claim. It cannot read the room, pick which live opponent is most vulnerable, and dismantle
that specific point — because it doesn't know what's in the thread. Standalone comments cap at
5; replies reach 8. The highest-scoring move in the game is the one that is hardest to automate.

**2. Diminishing returns.** Your first three comments in a debate score full; everything after
is halved. Volume never beats sharpness. Flooding a debate is a losing strategy by arithmetic.

**3. The side lock.** You commit to one side, publicly, before your first comment lands. You
cannot hedge, and you cannot farm both outcomes.

**What we deliberately do not do: run an AI-text detector.** They are unreliable, they are an
arms race we would lose, and they systematically false-flag non-native English speakers — who
are exactly the users a platform about reasoning should protect. We defend by design, never by
detection. A user who uses an AI to help sharpen a genuinely targeted rebuttal is not the enemy;
a user pasting generic filler is, and the scoring rules make that a losing move without ever
accusing anyone.

Two more guards, already covered above: the **walkover** rule (§7) kills self-farmed wins, and
the **season-only loss penalty** (§8) means the honest move — arguing a side you believe in even
when it's unpopular — is never punished on your permanent record.

---

## 14. Transparency — nothing hidden

**The principle:** a strict rule discovered *by surprise* feels like punishment. The same rule,
known *in advance*, feels like a game. Every mechanic in this document that can change a user's
outcome must be visible at the moment it matters — **before the irreversible action, not after
it.** A user should never be able to say "I didn't know."

This is a product requirement, not polish. A rule that is not surfaced is a bug.

| Rule | Surfaced where | When |
|---|---|---|
| **Side lock** | A confirmation step on your first comment: *"You're committing to FOR. You will not be able to argue AGAINST in this debate."* | **Before** it happens |
| Side lock, after | A persistent **"You're arguing FOR"** badge on the composer; the opposing side's composer visibly disabled with the reason shown | Always |
| **Reply beats standalone** | The composer states it plainly: *"Standalone comments cap at 5 logic. Reply to an opponent to earn up to 8."* Reply buttons sit on every opposing comment | While writing |
| **Diminishing returns** | A counter on the composer: *"Comment 2 of 3 at full value"* → then *"Half value — you've already made 3 comments here"* | While writing |
| **What you just earned** | **The points pop-up** (below) | Immediately after posting |
| **48h clock** | A live countdown in the arena and on every card | Always |
| **The draw zone** | The probability bar renders the draw band (47.5–52.5) as a marked zone, so you can *see* when a debate is heading for a draw and that it's still winnable | Always |
| **Loss costs season points** | Stated in the side-commit confirmation, and again in the verdict payout breakdown | Before **and** after |
| **MVP comes from the winning side** | Rules page, and the verdict card | Always |
| **Walkover risk** | A banner on any live debate with an empty side: *"Nobody has argued AGAINST yet. If nobody does, this concludes unopposed and nobody scores."* | While it applies |
| **Season window** | A **"Season 0 · 12 days left"** strip on the leaderboard and profile | Always |
| **Season prize** | Leaderboard header: *"The top 3 on the 1st earn a permanent title and avatar frame."* | Always |
| **Author bonus** | On the statement composer: *"You earn +5 logic when your statement produces a real debate."* | Before posting |
| **Abuse penalty** | Composer fine print, and stated in the rejection message | Before and after |
| **Stage placement** | Visible **Main Stage** / **Debate of the Day** labels on the cards that have them | Always |

### The points pop-up

The single most important piece of feedback in the product. Every time a comment is accepted,
an animated pop-up shows **what you earned and exactly why**:

```
        +7  logic
   ─────────────────────
   Targeted rebuttal of @maya — full range unlocked

   Season total  143   ·   Rank #12
```

When a modifier applies, the pop-up shows the arithmetic rather than hiding it:

```
   +5  logic          │     +3  logic
   ─────────────      │     ─────────────
   Judged 6           │     Judged 7
   Capped at 5        │     Halved — 4th comment
   (standalone)       │     in this debate
```

This is how the rules get taught: through play, in the moment, with the actual number. A user
who has seen "capped at 5 (standalone)" once will use the reply button next time — and that is
the behaviour the whole game is designed to produce.

### Return triggers

Three notifications, in an in-app inbox. Every one deep-links to a live debate or a payoff:

1. **Someone replied to your comment.** Personal, specific, and time-sensitive — the strongest
   pull in the product, and now precise because replies are explicit.
2. **Someone joined the other side of your debate.** Your statement became a real contest.
3. **The verdict is in.** Won, lost, drawn, or MVP.

---

## 15. Every number in one place

Every tunable constant in the game. If a number is in the code, it is in this table.

| Constant | Value | §  |
|---|---|---|
| Debate duration | **48 hours** | §3 |
| Draw threshold — margin must **exceed** this | **5** points | §7 |
| Comment score range | **1–8** | §6 |
| Standalone comment cap | **5** | §6 |
| Full-value comments per debate | **3**, then halved | §6 |
| Halving floor | **1** | §6 |
| Like bonus | **+2** | §6 |
| Abuse penalty | **−4** | §6 |
| MVP bonus | **+25** (replaces the win bonus) | §8 |
| Win bonus | **+10** | §8 |
| Loss penalty | **−5**, season score only | §8 |
| Author bonus | **+5** | §8 |
| Walkover payout | **0** to everyone | §7 |
| Season length | **1 calendar month**, UTC | §10 |
| Season awards | **Top 3** — title + frame | §10 |
| Main Stage size | **~4** + the Debate of the Day | §11 |
| Debate of the Day | **1 per day** | §11 |
| Tier thresholds | 0 / 50 / 100 / 150 / 200 | §9 |

---

## 16. What v1 is not

Deliberately out of scope. Every one of these is designed and preserved in
[`future-features.md`](./future-features.md) — deferred, not discarded.

- **Live video debate arena** with a speaking AI judge — the largest single future subsystem
- **Rounds / rematch** — re-running a claim in a later season on one canonical page
- **A ladder of divisions** with ladder points and placement resets
- **Hall of Fame pages** and cosmetics beyond the top-3 titles
- **Underdog multipliers** and upset bonuses
- **Losing-side standout** recognition
- **Hot extensions** to the 48h clock
- **Community upvotes** feeding the stage
- **Email and digest notifications**, web push
- **AI opponents** filling an empty side
- **Direct challenges** — calling out a specific opponent
- **Seeded evergreen debates**

v1 is the smallest complete game: **post, take a side, argue, get judged, climb the month.**
Everything above is something to add once real users prove they want it.
