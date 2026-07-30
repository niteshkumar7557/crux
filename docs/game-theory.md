# Crux — Game Theory

**Crux is a debate platform where every argument ends.** You post a claim, two camps form, you
argue for 48 hours, and then a neutral AI judge rules — a winner, a margin, an MVP, and a written
verdict. Your reasoning earns you a score. Every month the board resets so anyone can win it.

This file is the **complete rules of the game**, describing the product exactly as it works
today. It is the source of truth: **if any other document or any comment in the code disagrees
with this file, this file wins.**

Sections here are numbered, and the code points back at them. A comment reading
`Spec: game-theory.md §7` means that file implements §7 — start there, then read the code.
Designs that were finished and deliberately left out live in
[`future-features.md`](./future-features.md).

| Also read | For |
|---|---|
| [`codebase-guide.md`](./codebase-guide.md) | how the code is organised and where each rule lives |
| [`design-system.md`](./design-system.md) | how any of this looks on screen |
| [`../README.md`](../README.md) | the pitch and local setup |

---

## §1 The game — what v1 does

Every row is a feature, what it is, and why a user cares.

| Feature | What it is | Why it matters |
|---|---|---|
| **AI-gated motions** | An AI referee reads your claim before it goes live and rejects vague or unarguable ones, offering a sharper rewrite | You never walk into a debate that was doomed by a bad question |
| **Two-sided arena** | Every debate has exactly two camps — FOR and AGAINST — each with a live AI-written case | You always know what you're up against, and what your side's best argument currently is |
| **48-hour clock** | Every debate ends. No perpetual threads | Your effort resolves. There is a payoff moment, and a reason to come back |
| **Side lock** | Your first argument commits you to one side for that debate | Nobody can hedge both sides to guarantee a win. The two camps are real |
| **Direct replies** | You reply to a specific argument on the opposing side, and that reply earns the most | Being *right at* someone is worth more than talking past them. This is what makes it a debate |
| **Logic score** | An AI scores every contribution 1–8 on how well it engages the actual argument | Reputation earned by reasoning, not by follower count or upvotes |
| **The verdict** | At 48h an AI judge names a winner, a margin, an MVP, and writes why | An unbiased conclusion — the thing normal internet arguments never produce |
| **W–L–D record** | Permanent win/loss/draw record on your profile | A career. Proof you argue well, not just often |
| **Monthly seasons** | The board tracks logic earned *this month* and resets on the 1st | A newcomer can top the board in week one. Nobody is locked out by a veteran's pile of points |
| **Season titles** | The top 3 each month earn a permanent title and avatar frame | Something to keep, forever, that says you won a month |
| **Main Stage + Motion of the Day** | The best live debates get concentrated on one stage | You never land on a dead debate with nobody to argue against |
| **Verdict share card** | Concluded debates generate a share image and a certificate | Your win travels. It's the thing you paste into a group chat |
| **Talk to the developer** | A direct message thread with the person who built it, relayed to their phone | A one-person product that answers |

---

## §2 Vocabulary

These words are used precisely, in the product and in the code. Fix them now.

| Word | Meaning |
|---|---|
| **Motion** | The claim being argued — one bold declarative sentence submitted by a user. The **thing**: what you post, what gets featured, what the verdict rules on |
| **Debate** (or **arena**) | The **activity** on a motion: its two cases, its arguments, its clock, its verdict. One motion → one debate. You do not post a debate; you post a motion and a debate happens on it |
| **Side** | `FOR` or `AGAINST`. There are exactly two |
| **Case** (or **analysis**) | The AI-maintained running summary of one side's position — a lead paragraph plus attributed points. Rewritten as new arguments land (§17) |
| **Argument** | One user's contribution to one side. The atomic unit of arguing |
| **Reply** | An argument aimed at a specific argument on the **opposing** side |
| **Verdict** | The AI judge's closing ruling: winner, margin, MVP, and a written explanation |
| **Logic** | The single skill score. Earned by arguing |
| **Record** | Your permanent W–L–D from concluded debates |
| **Season** | One calendar month of competition |
| **Domain** | One of twelve fixed topic categories a motion belongs to |

> **A known inconsistency.** The product says FOR / AGAINST; the database columns and API paths
> say `affirmative` / `negative`. Both mean the same two sides. Renaming is a product-wide
> decision, not a local fix — do not half-do it.

---

## §3 The loop

```
  POSTING                                 ARGUING
  ───────                                 ───────
  1. Write a claim, pick a domain      4. Read both cases + the live split.
     (or let the AI choose).              Pick a side.
         │                                     │
         ▼                                     ▼
  2. ARBITER (AI) judges it.           5. Your FIRST argument LOCKS your side
     Fail → the reason + a sharper        for this debate. Confirmed up front.
     rewrite to try instead.                  │
         │  (on pass)                         ▼
         ▼                              6. Argument — standalone, or REPLY to a
  3. OPENING ANALYST (AI) writes           specific opposing argument.
     the strongest FOR case and               │
     AGAINST case. The 48h clock              ▼
     starts. The arena is live.        7. Server refuses a verbatim repost (§8).
         │                                    │
         │                                    ▼
         │                             8. ANALYST (AI) screens for abuse, scores
         │                                you 1–8, and rewrites your side's case.
         │                                    │
         │                                    ▼
         │                             9. You see exactly what you earned and why.
         │                                    │
         │                                    ▼
         │                            10. PROBABILITY JUDGE nudges the live split
         │                                (once both sides have argued).
         │                                    │
         └──────────► arena ◄────────────────┘
                        │
                        ▼  at 48:00:00
              11. Arena LOCKS read-only.
                  VERDICT JUDGE rules.
                  Payouts land. Records update.
                  Share card and certificate generate.
```

---

## §4 The clock

- Every debate runs **exactly 48 hours** from the moment it goes live. No extensions, no early
  closes.
- The countdown is visible everywhere the debate appears — in the arena and on every card.
- At zero the arena **locks read-only**: no new arguments, no new replies, no likes. It stays
  permanently readable.
- The verdict fires on the next sweep of the conclusion job, within a minute of lock.

**Why a fixed clock:** it makes the deadline a shared, predictable event. "This closes tomorrow at
6pm" is something a user can plan around; a variable clock is something they have to keep
checking.

---

## §5 Sides and the lock

- Every debate has exactly two sides: **FOR** and **AGAINST**.
- **Your first argument locks your side for that debate.** You cannot argue the other side of the
  same debate afterwards. The lock is per-debate — you're free to take FOR in one debate and
  AGAINST in the next.
- **Replying locks you too**, to the side *opposite* the argument you answer. The side is derived
  from the reply target, never trusted from the request.
- The lock is confirmed **before** it happens, never discovered after (§19).

**The motion's author argues FOR, and only FOR.** You posted the claim; the affirmative case is
yours. You may argue on your own motion — and you earn the author bonus (§12) whether you do or
not — but you cannot cross to AGAINST it, by a direct post or by a reply that would derive
AGAINST. Enforced server-side, so it holds even against a direct API call.

**Why the lock exists:** without it, the optimal strategy is to argue both sides and be guaranteed
a win. The lock is what makes the two camps real, and what makes a verdict mean something. The
author rule is the same principle applied to the one person who cannot claim to be undecided.

---

## §6 Arguments and replies

Two ways to contribute:

**Standalone argument** — you make a point on your side. It goes in your side's column.

**Reply** — you pick a specific argument on the **opposing** side and answer it directly. Your
reply still lives in **your own side's column** (side integrity is never broken), carrying a
compact quote of what it answers. The argument you replied to shows a `↳ N replies` counter.

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
  Enforced server-side — it is a rule, not a UI convention.
- **Chains form naturally.** A reply is itself an argument on a side, so the other camp can reply
  back to it. Real exchanges emerge.
- **Many-to-one is fine.** Several people can reply to the same argument.
- **Replying sets your side lock** if you haven't argued yet.
- Replies do not create a separate thread view. The two columns stay chronological; the quote stub
  and the counter carry the connection.
- An argument is capped at **2000 characters**.

**Why replies are the centre of the design:** a reply makes "did you engage a real opponent?" a
fact in the data rather than something an AI has to infer. That is the single strongest defence
against pasted AI text (§18), and it is what turns parallel monologues into a debate.

---

## §7 Scoring

**Logic is the only skill number.** It starts at 0 and is earned by arguing.

| Action | Logic |
|---|---|
| **Reply** to a specific opposing argument | **1–8**, judged by the AI. A sharp, targeted rebuttal earns 7–8 |
| **Standalone** argument | **1–8 judged, then capped at 5.** It engages nothing specific |
| Standalone when **the opposing side is still empty** | **1–8, uncapped.** There was nothing to reply to yet |
| Your **4th and later** argument in one debate | **halved** (floor 1), after all other rules |
| A point already made on your side, reworded | **1**, however well written (§8) |
| Someone **likes** your argument | **+2** to you (§10) |
| Your argument is flagged as **abuse** | **−4**, and the argument is discarded (§9) |

**Order of operations** — score the argument 1–8 → apply the standalone cap → apply the halving →
award. The user is shown this breakdown every time (§19).

Your all-time logic **never falls below 0**, whatever penalties land.

**What the AI is actually judging** — not eloquence, not length, not grammar, and not whether it
agrees. It scores how much the argument *moves the argument*: does it answer a specific point,
does it introduce something the case doesn't already contain, does it hold up. A well-written
paragraph that ignores everything already said scores low on purpose, and a rough, non-native
sentence that lands a real hit scores high. That is not a nicety; it is enforced by the way the
prompt is ordered (§16).

---

## §8 Originality — reposts and restatements

The same exploit at two levels of effort, refused at two different layers.

**A verbatim repost is refused outright**, before the AI is ever called. Two cases:

- **Reposting your own argument** to collect its score twice — refused at any length.
- **Copying someone else's argument** and posting it as your own — the more valuable exploit,
  because that text has already been proven to score well. Refused at **40 normalised characters
  or more**. Below that, short agreements ("i agree", "exactly this") collide innocently and score
  1–2 anyway, so copying one gains nothing.

Comparison ignores case, punctuation, spacing and Latin accents, so trivial edits do not evade it.
It costs no tokens and takes no judgement.

**A reworded restatement scores 1.** Making a point that has already been made on your side — by
you or by a team-mate, reworded, translated or reordered — earns the floor. This is a judgement,
so it belongs to the AI, which is shown your side's recent arguments precisely so it can recognise
one. Adding a new reason, example, mechanism or piece of evidence to an existing point is **not** a
restatement; only the same point again is.

**Why the split:** the cheap deterministic check handles the cheap attack, so the expensive
judgement call is only spent where judgement is actually needed.

---

## §9 Moderation

Every argument is screened before it reaches the arena. A flagged argument is **discarded** — it
is never inserted, never shown — and costs its author **4 logic**.

**The line is the argument versus the person.**

- Attacking the **argument** is never abuse, however blunt. "This reasoning collapses", "that is
  factually wrong", "this logic is stupid, you ignore the cost" — all fine, rough phrasing
  included.
- Attacking the **person** is: "shut up", "you're an idiot", "do some reading before you post".
- So are slurs and hate speech in any language, threats, sexually explicit content, spam and
  gibberish.
- When it is genuinely ambiguous between a harsh argument and a personal attack, it is **not**
  abuse.

Screening is multilingual by design, including romanised Hindi profanity, which default moderation
misses.

**Why the line sits there:** a debate platform that punishes force of argument has no reason to
exist. The thing being protected is the person, not their claim.

---

## §10 Likes

A like pays the argument's author **+2 logic**.

- **You cannot like your own argument** — that would be minting your own currency. Enforced
  server-side.
- **Likes are reversible.** Un-liking removes the like, decrements the count and **takes the +2
  back**. Both directions are idempotent: liking twice, or un-liking something you never liked,
  changes nothing.
- Likes close with the arena. A concluded debate is read-only.
- Likes also order what the Verdict Judge reads: at conclusion the judge is handed the top
  arguments **by likes** (§11).

---

## §11 The verdict

At lock, the **Verdict Judge** reads the motion, both final cases, the top arguments by likes, and
the reply structure, then returns a split, a winner, an MVP and a closing.

- **Margin = |for% − against%|.**
- **Margin > 5 → that side wins.** (58–42 is a 16-point margin: FOR wins.)
- **Margin ≤ 5 → draw.** (52–48 is a 4-point margin: draw.)
- **MVP** is the single best debater **on the winning side**. There is no MVP on a draw — there is
  no winning side to take one from.
- **Closing** is a short written explanation naming the crux and why it resolved that way. This is
  the capstone the whole 48 hours builds toward, and the text on the share card and certificate.

The judge's numbers are treated as a **ratio, not gospel**: they are renormalised to sum to 100,
the winner is recomputed from the margin rather than taken from the model, and the MVP must match
a real participant on the winning side or it is dropped. Rules stated to users are enforced in
code, not requested of a model.

**Walkover** — if one side has **zero** arguments at lock, the debate concludes "unopposed."
**Nobody scores anything** — no logic, no W/L/D, not even the author bonus. You cannot win a
contest nobody entered, and this closes the obvious exploit of posting a motion and farming an
uncontested win. No AI call is made.

The risk is surfaced (§19) only in the **final 6 hours**. A debate with an empty side on its first
morning is not at risk, it is simply young — warning then would cry wolf on nearly every new
motion and train people to ignore the banner.

---

## §12 Payouts

| Who | Logic | Record |
|---|---|---|
| **MVP** (winning side) | **+25** | +1 W, MVP badge |
| Winning side, everyone else | **+10** | +1 W |
| Losing side | **−5 to your season score only.** Your all-time logic never falls | +1 L |
| Both sides, on a draw | 0 | +1 D |
| Motion author, on a decisive or drawn conclusion | **+5** | — |
| Anyone, on a walkover | 0 | — |

The MVP's +25 **replaces** the +10; it does not stack. The author bonus is separate, so an author
who also argued receives both.

**How the season-only penalty works:** logic is recorded as a timestamped ledger of events, so
"logic earned this season" is a sum over the current month while the all-time score is a running
total. A loss writes a **−5 ledger row that is excluded from the all-time total** — it drags your
season board position down and leaves your career score untouched. One number, two readings.

**Why the loss penalty is season-only:** losing should cost you the race, not your career. A
permanent deduction would make people avoid the unpopular side of every debate — exactly the
problem a young platform cannot afford. This way a loss is a real setback in the month you are
competing in, and invisible on the record of who you are.

### Worked example

Maya opens FOR while AGAINST is still empty (+7 uncapped), replies to an opponent (+6), then posts
a standalone (judged 6, capped to 5). **In-match: +18.**

The debate closes **FOR 58 – AGAINST 42**. Margin 16 > 5, so FOR wins, and Maya is MVP.

- **Maya:** 18 + 25 = **+43 logic**, +1 W, MVP badge.
- **Dev**, who argued AGAINST across three arguments (+16): keeps **16 all-time**, but his
  **season** total for those arguments is 11 after the −5. +1 L.
- **Sam**, who posted the motion and argued FOR (+12): 12 + 10 (win) + 5 (author) = **+27**, +1 W.

Read the gradient: **arguing** is the base income, **winning** is worth about half a debate's work,
and **MVP** is worth more than the arguing itself. Losing still leaves you well ahead of not
showing up. **Nobody should ever regret participating** — that is the property these numbers exist
to protect.

---

## §13 Identity — record, tiers, bio

A profile carries:

- **Logic score** — all-time, monotonic. Never falls, never drops below 0.
- **Record** — `W – L – D`, all-time, from concluded debates.
- **MVP count** — all-time.
- **Global rank** — position by all-time logic.
- **Tier** — a coarse badge derived from all-time logic. Progress you can feel long before you are
  anywhere near a leaderboard.

| Logic | Tier |
|---|---|
| 0–99 | Beginner |
| 100–199 | Intermediate |
| 200–299 | Skilled |
| 300–399 | Expert |
| 400+ | Master |

Because logic never decays, a tier reads as **lifetime accomplishment, not current skill** — and
that is deliberate. "How sharp are you right now" is what the season board is for.

- **Season titles and avatar frames** — permanent, stacking (§14).
- **A logic ledger** — twelve weeks of earnings, charted. Weeks can net negative: the season-only
  loss penalty is included, because that is the honest reading of the month.
- **Craft stats** — arguments posted, how many were replies, average logic per argument, motions
  opened, and your single best-scoring argument.
- **A bio**, capped at 280 characters.

> **Open gap.** The bio column is written by two things: the user, through the bio editor, and the
> Debater Profiler AI (§16), which rewrites it from your recent motions every time you post one.
> Posting a motion therefore overwrites a hand-written bio. The intended design — a generated
> blurb that a manual override beats — is specified in
> [`future-features.md`](./future-features.md).

---

## §14 Seasons

- **A season is one calendar month, UTC.** Season 0 is the launch month; Season 1 is the following
  month, and so on. The launch month is configured, not hardcoded.
- **The Season board** ranks users by **logic earned during this month**. Everyone starts each
  month at 0. It is the default board.
- **The All-Time board** ranks users by career logic, and never resets. Two tabs, one page.
- Your all-time logic is *not* affected by the reset — only the board's window is.

**Why the reset is the whole point:** if the board ranked all-time logic, a user who joined in
month one would sit on top forever and everyone who arrives later is playing for second place.
Ranking the month means **the current board is always winnable**, by anyone, from zero. It also
separates "how sharp are you right now" from "what have you built over your career."

### Season end

At the month boundary, a rollover job:

1. **Snapshots the final Season board**, on the same window and tiebreak the live board used.
2. **Awards the top 3** a permanent title and avatar frame:

   | Rank | Title | Frame |
   |---|---|---|
   | 1 | **Champion of Season N** | Gold |
   | 2 | **Challenger of Season N** | Silver |
   | 3 | **Contender of Season N** | Bronze |

3. Notifies each winner.

**A non-positive season total earns nothing.** A month nobody played is not a month somebody won,
and a permanent title is the one reward that can never be taken back. A month before Season 0 can
never be awarded at all.

Titles and frames are **permanent and stacking** — a profile displays every one ever earned. They
are the only reward that survives a season, and they are **status only**: no logic, no advantage,
no special powers. A season's prize is proof you won a month.

Nothing else resets. There is no decay, no streak, and no penalty for taking a month off.

---

## §15 The stage — how debates get found

The core problem for a young platform isn't too little content; it's attention spread so thin that
a thousand motions each get zero opponents. The fix is **concentration**.

- **Motion of the Day** — one live debate, crowned once per UTC day, on the arena hero slot.
- **Main Stage** — roughly 4 more featured live debates below it.
- **Everything else** stays fully browsable through Newest, the 12 domains, the archive and
  search. Nothing is throttled or hidden — posting always works instantly and always goes live.

**How the stage is picked — heat plus a pin.**

**Heat** = argument velocity × side balance, measured over a **rolling 6-hour window** and
recomputed every 5 minutes for every live debate. Heat measures what a debate is doing *now*, not
what it once did.

Balance is what makes this a *contest* ranking rather than a popularity ranking: a debate split
50/50 scores its full velocity, while a 90/10 pile-on is discounted toward a floor. A 50/50 fight
at 10 arguments an hour beats a 90/10 blowout at 20. The stage should showcase fights, not
landslides.

**The pin** — an admin can pin any **live** debate onto the Main Stage, or hand-crown the Motion of
the Day. At launch, when there is barely enough volume for heat to mean anything, pinning is how
the stage gets its taste; as real volume arrives, heat takes over and pinning becomes the
exception. One mechanism that is honest on day one and still correct at scale. Concluded debates
can never be pinned — the stage exists to send readers somewhere they can still argue.

The Motion of the Day is re-crowned early if the reigning one concludes, so the hero is never a
dead debate. Featured debates carry a visible **Main Stage** label and the Motion of the Day
carries its own, so nothing about placement is mysterious.

---

## §16 The Crux AI — six personas

Every AI call is a distinct persona with its own prompt and its own job. Naming them separately
matters: features attach to specific personas, and a change to one should never silently change
another. **One model runs all six** — there is no smart/fast split.

| # | Persona | Fires when | Decides |
|---|---|---|---|
| 1 | **Arbiter** | A motion is submitted | Pass or fail, the reason, a sharper rewrite, the keyword, the domain |
| 2 | **Opening Analyst** | A motion passes | The strongest opening FOR case and AGAINST case |
| 3 | **Moderator / Analyst** | Every argument | Abuse screen → a 1–8 score → a rewrite of that side's running case |
| 4 | **Probability Judge** | Every argument, once both sides have argued | The live win split |
| 5 | **Verdict Judge** | At lock | Winner, margin, MVP, and the written closing |
| 6 | **Debater Profiler** | A motion is published (best-effort) | A character sketch for the author's profile |

When an argument is a **reply**, persona 3 is additionally handed the exact argument being answered
and scores the rebuttal against it. When it is standalone, it only sees the opposing side's case —
and the score is capped at 5. **That difference in what the model is shown is precisely what makes
replies worth more.** It is not a multiplier in code.

The Probability Judge is **stateful**: it starts from the split the debate currently shows and
nudges it by however much the argument that just landed changed the balance — nothing new moves it
0, a solid point 3–8, a decisive unanswered hit up to 12. Re-deriving the split cold each time made
the bar swing for no visible reason. It judges the two synthesised cases, never argument counts,
vote counts, or the conventional position.

### Decode first — the house technique

Reasoning tokens are **off**, deliberately: on this model they are billed as output *and* counted
against the token ceiling, which truncates the shorter calls into invalid JSON, and every persona
answers by rubric rather than by derivation.

So the "thinking" lives somewhere else. **Every judging prompt makes the model write its analysis
into fields the code never reads, before it emits the number it is judged on** — the Arbiter
restates the claim with its grammar repaired before ruling on it; the Analyst names the decoded
claim, what it engages and the logical move before scoring; the Verdict Judge names which argument
won it and why before naming a person.

This is what makes the scores blind to eloquence and to non-native English. **The field order in
those prompts is load-bearing.** Move a decode field after the number it feeds and the mechanism
is gone.

---

## §17 The living case

Each side's case is **structured data, not prose**: a lead paragraph and up to six points, each
point carrying the id of the argument it came from. The arena renders each attributed point as a
link back to the argument that made it.

**Attribution is a trust boundary.** The model returns an argument id and a text, and nothing
else. The author is looked up **server-side** from that id against the debate's real arguments — so
an id the model invents costs that point its link and nothing more. It can never invent a person,
and it can never credit a point to the other side.

When the Analyst rewrites a side, it keeps the strong existing points (re-using their ids), adds
the new argument's point, and silently drops weak or repeated ones. It is shown its **own** side's
ids so a carried-forward point keeps its link, and the opposing case **without** ids — that side is
context, not material. A rewrite that sanitises to empty is treated as "no update" and the previous
case stands.

The two cases never merge: an Analyst is forbidden from pulling opposing content into its own side,
because over a long debate that converges both sides into the same document.

---

## §18 Integrity — how the game stays honest

Four structural facts, not four detectors.

**1. You must reply to score high.** A language model can write a polished, general essay about
any claim. It cannot read the room, pick which live opponent is most vulnerable, and dismantle that
specific point — because it doesn't know what's in the thread. Standalone arguments cap at 5;
replies reach 8. The highest-scoring move in the game is the one that is hardest to automate.

**2. Diminishing returns.** Your first three arguments in a debate score full; everything after is
halved. Volume never beats sharpness. Flooding a debate is a losing strategy by arithmetic.

**3. The side lock.** You commit to one side, publicly, before your first argument lands. You
cannot hedge, and you cannot farm both outcomes. The motion's author cannot argue against their own
claim at all.

**4. Originality is enforced twice** — verbatim reposts refused deterministically, restatements
scored 1 by judgement (§8). Neither your own text nor a team-mate's proven argument can be
recycled.

**What we deliberately do not do: run an AI-text detector.** They are unreliable, they are an arms
race we would lose, and they systematically false-flag non-native English speakers — exactly the
users a platform about reasoning should protect. We defend by design, never by detection. A user
who uses an AI to help sharpen a genuinely targeted rebuttal is not the enemy; a user pasting
generic filler is, and the scoring rules make that a losing move without ever accusing anyone.

Two more guards, covered above: the **walkover** rule (§11) kills self-farmed wins, and the
**season-only loss penalty** (§12) means the honest move — arguing a side you believe in even when
it's unpopular — is never punished on your permanent record.

---

## §19 Transparency — nothing hidden

**The principle:** a strict rule discovered *by surprise* feels like punishment. The same rule,
known *in advance*, feels like a game. Every mechanic in this document that can change a user's
outcome must be visible at the moment it matters — **before the irreversible action, not after
it.** A user should never be able to say "I didn't know."

**This is a product requirement, not polish. A rule that is not surfaced is a bug.**

| Rule | Surfaced where | When |
|---|---|---|
| **Side lock** | A confirmation step on your first argument: *"You're committing to FOR. You will not be able to argue AGAINST in this debate."* | **Before** it happens |
| Side lock, after | A persistent "You're arguing FOR" badge on the composer; the opposing composer visibly disabled with the reason | Always |
| **Reply beats standalone** | The composer states it plainly: *"Standalone arguments cap at 5 logic. Reply to an opponent to earn up to 8."* Reply buttons sit on every opposing argument | While writing |
| **Diminishing returns** | A counter on the composer: *"Argument 2 of 3 at full value"* → then *"Half value"* | While writing |
| **What you just earned** | The points pop-up (below) | Immediately after posting |
| **48h clock** | A live countdown in the arena and on every card | Always |
| **The draw zone** | The probability bar renders the draw band (47.5–52.5) as a marked zone, so you can *see* a debate heading for a draw and that it's still winnable | Always |
| **Loss costs season points** | In the side-commit confirmation, and again in the verdict payout breakdown | Before **and** after |
| **MVP comes from the winning side** | Rules page, and the verdict card | Always |
| **Walkover risk** | A banner on a live debate with an empty side, once **under 6 hours** remain | Final 6 hours |
| **Season window** | A "Season 0 · 12 days left" strip on the leaderboard and profile | Always |
| **Season prize** | Leaderboard header: *"The top 3 on the 1st earn a permanent title and avatar frame."* | Always |
| **Author bonus** | On the motion composer | Before posting |
| **Abuse penalty** | Composer fine print, and stated in the rejection message | Before and after |
| **Repost refusal** | Rules page, and the composer's error names which kind it was | Before and after |
| **Stage placement** | Visible Main Stage / Motion of the Day labels on the cards that have them | Always |
| **Rate limits** | A 429 that says how long to wait, plus a line on the rules page | On hit |
| **Message length cap** | A live counter on the developer-message composer | While writing |

> **Two open gaps, unfixed.** The **author-argues-FOR-only** rule (§5) and the **self-like block**
> (§10) are enforced by the server but stated nowhere before a user hits them. By the principle
> above, both are bugs. They are recorded here rather than quietly tolerated.

### The points pop-up

The single most important piece of feedback in the product. Every time an argument is accepted, an
animated pop-up shows **what you earned and exactly why** — as a ledger, where every rule that bit
is priced:

```
        +2  logic
   ─────────────────────
   Judged                8
   Standalone cap       −3
   Repeat halving       −3
   ─────────────────────
   Awarded               2

   Season total  143   ·   Rank #12
```

Pricing each rule is the point. "Capped at 5" tells you where you landed; "Standalone cap −3" tells
you what it cost — and that is the number that changes behaviour. When nothing bit, there is no
arithmetic: one row, and a note saying why the full range was in play.

This is how the rules get taught: through play, in the moment, with the actual number. A user who
has seen "Standalone cap −3" once will use the reply button next time — and that is the behaviour
the whole game is designed to produce.

---

## §20 Notifications

Four in-app return triggers, in a navbar inbox. Every one deep-links to a live debate or a payoff.

1. **Someone replied to your argument.** Personal, specific, time-sensitive — the strongest pull in
   the product, and precise because replies are explicit.
2. **Someone joined the other side of your debate.** Sent to the opposing side and to the motion's
   author: your motion became a real contest.
3. **The verdict is in.** Won, lost, drawn, or MVP — the copy says which.
4. **You placed in a season.** Your permanent title is yours.

All four are written best-effort, after the work they describe has committed. A failed notification
must never roll back a verdict or a posted argument.

Separately, **Talk to the developer** is a two-way message thread from the navbar, relayed to the
developer's phone. Postgres is the record and the relay is a view of it, so the panel works, saves
and shows unread state even when the relay is down; anything unsent is delivered when it comes
back.

---

## §21 Every number in one place

Every tunable constant in the game. **If a number is in the code, it is in this table.**

| Constant | Value | § |
|---|---|---|
| Debate duration | **48 hours** | §4 |
| Argument length cap | **2000 characters** | §6 |
| Argument score range | **1–8** | §7 |
| Standalone argument cap | **5** | §7 |
| Full-value arguments per debate | **3**, then halved | §7 |
| Halving floor | **1** | §7 |
| Cross-user repost minimum | **40** normalised characters | §8 |
| Abuse penalty | **−4** | §9 |
| Like / unlike | **+2 / −2** | §10 |
| Draw threshold — margin must **exceed** this | **5** points | §11 |
| Arguments handed to the Verdict Judge | **40**, by likes | §11 |
| Walkover payout | **0** to everyone | §11 |
| Walkover warning window | **6 hours** | §11, §19 |
| MVP bonus | **+25** (replaces the win bonus) | §12 |
| Win bonus | **+10** | §12 |
| Loss penalty | **−5**, season score only | §12 |
| Author bonus | **+5** | §12 |
| Logic floor | **0** | §7, §13 |
| Tier thresholds | 0 / 100 / 200 / 300 / 400 | §13 |
| Bio length cap | **280 characters** | §13 |
| Profile ledger window | **12 weeks** | §13 |
| Season length | **1 calendar month**, UTC | §14 |
| Season awards | **Top 3** — title + frame, positive totals only | §14 |
| Main Stage size | **4** + the Motion of the Day | §15 |
| Motion of the Day | **1 per UTC day** | §15 |
| Heat window | **6 hours** | §15 |
| Heat balance floor | **0.25** | §15 |
| Case points per side | **6** max | §17 |
| Probability move cap | **12** points per update, floor/ceiling 20–80 | §16 |
| Username | **3–20** chars, `a-z0-9_`, ≥1 letter | §13 |

**These are deliberately not environment variables.** Each is asserted by a unit test and most are
printed to users as prose, so an env override would make the product lie about its own rules.
Changing one is a coordinated edit — see the checklist in
[`codebase-guide.md`](./codebase-guide.md).

---

## §22 Not in v1

Deliberately out of scope. Every one is designed and preserved in
[`future-features.md`](./future-features.md) — deferred, not discarded.

- **Live video debate arena** with a speaking AI judge — the largest single future subsystem
- **Rounds / rematch** — re-running a claim in a later season on one canonical page
- **A ladder of divisions** with ladder points and placement resets
- **Hall of Fame pages** and cosmetics beyond the top-3 titles
- **A generated profile blurb a manual bio beats** — the fix for the §13 conflict
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
