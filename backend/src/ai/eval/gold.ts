// The gold set the AI is scored against. Fixtures only, no logic.
//
// The scoring bands are hand-calibrated, not derived: every case below was
// scored by a human first, and the band is that score with a point of slack
// either side. Spec: docs/superpowers/specs/2026-07-30-judging-recalibration-design.md §4.
//
// Five motions on purpose. The old set lived on one debate, which made it
// impossible to tell a rubric that generalises from one tuned to nuclear power.

import type { AnalystPromptInput, OwnSideArgument } from "../analyst.logic.js";

// ─── M1 · remote work ────────────────────────────────────────────────────────
const M1 = "Remote work permanently lowers early-career skill development.";
const M1_FOR =
  "Juniors lose the ambient observation that builds judgment.\n\n### Key Arguments\n- **@maya** — juniors lose the ambient observation that builds judgment";
const M1_AGAINST =
  "Juniors learn more reliably from documented, asynchronous work than from office osmosis.\n\n### Key Arguments\n- **@dev** — written, searchable decisions beat overheard ones";
const M1_FOR_ARGS: OwnSideArgument[] = [
  { id: 201, username: "maya", content: "Juniors lose the ambient observation that builds judgment." },
];
const M1_AGAINST_ARGS: OwnSideArgument[] = [
  { id: 202, username: "dev", content: "Written, searchable decisions beat overheard ones for anyone learning." },
];

// ─── M2 · platform liability ─────────────────────────────────────────────────
const M2 = "Social media platforms should be legally liable for algorithmic amplification.";
const M2_FOR =
  "Amplification is an editorial choice, and editors are liable.\n\n### Key Arguments\n- **@riya** — ranking content is an editorial act, not neutral hosting";
const M2_AGAINST =
  "Liability for amplification collapses into liability for hosting, which kills the open internet.\n\n### Key Arguments\n- **@kai** — no platform can host at scale if every ranking decision is actionable";
const M2_FOR_ARGS: OwnSideArgument[] = [
  { id: 211, username: "riya", content: "Ranking content is an editorial act, not neutral hosting." },
];
const M2_AGAINST_ARGS: OwnSideArgument[] = [
  { id: 212, username: "kai", content: "No platform can host at scale if every ranking decision is actionable." },
];

// ─── M3 · Indian exams ───────────────────────────────────────────────────────
const M3 = "India's exam system measures memorization, not intelligence.";
const M3_FOR =
  "Competitive entrance exams reward pattern-drilling over reasoning.\n\n### Key Arguments\n- **@priya** — the tests reward drilled recall, not reasoning";
const M3_AGAINST =
  "Standardized recall is the fairest scalable filter in a country with twenty million applicants.\n\n### Key Arguments\n- **@arun** — an anonymous common paper is the least corruptible instrument at that scale";
const M3_FOR_ARGS: OwnSideArgument[] = [
  { id: 221, username: "priya", content: "The tests reward drilled recall, not reasoning." },
];

// ─── M4 · UBI ────────────────────────────────────────────────────────────────
const M4 = "Universal basic income would reduce work incentives.";
const M4_FOR =
  "Cash without conditions weakens the wage floor's pull.\n\n### Key Arguments\n- **@sam** — unconditional cash weakens the wage floor's pull on marginal workers";
const M4_AGAINST =
  "Every trial we have shows employment holds or rises.\n\n### Key Arguments\n- **@dev** — every trial on record shows employment flat or up";
const M4_FOR_ARGS: OwnSideArgument[] = [
  { id: 231, username: "sam", content: "Unconditional cash weakens the wage floor's pull on marginal workers." },
];
const M4_AGAINST_ARGS: OwnSideArgument[] = [
  { id: 232, username: "dev", content: "Every trial on record shows employment flat or up." },
];

// ─── M5 · embryo editing ─────────────────────────────────────────────────────
const M5 = "Gene editing of human embryos should be permitted for disease prevention.";
const M5_FOR =
  "Somatic gene therapy already treats inherited disease; this is the same technology one step earlier.\n\n### Key Arguments\n- **@noor** — somatic therapy already edits the same genes in living patients";
const M5_AGAINST =
  "Consent is impossible for a person who does not yet exist.\n\n### Key Arguments\n- **@tomas** — the edited party can never agree to the edit";
const M5_FOR_ARGS: OwnSideArgument[] = [
  { id: 241, username: "noor", content: "Somatic therapy already edits the same genes in living patients." },
];
const M5_AGAINST_ARGS: OwnSideArgument[] = [
  { id: 242, username: "tomas", content: "The edited party can never agree to the edit." },
];

export interface ScoringCase {
  id: string;
  input: AnalystPromptInput;
  expect: {
    band: [number, number];
    verdict?: "ok" | "abuse" | "no_argument";
    // Which way the win split should move from input.priorAffirmative.
    // Omitted where there is nothing meaningful to assert (openers).
    splitDirection?: "for" | "against" | "flat";
  };
  note: string;
}

// Every case shares this skeleton; only what the case is testing varies.
function makeCase(
  id: string,
  note: string,
  expect: ScoringCase["expect"],
  input: Omit<AnalystPromptInput, "author" | "newArgumentId"> &
    Partial<Pick<AnalystPromptInput, "author" | "newArgumentId">>,
): ScoringCase {
  return {
    id,
    note,
    expect,
    input: { author: "kip", newArgumentId: 63, ...input } as AnalystPromptInput,
  };
}

export const SCORING_CASES: ScoringCase[] = [
  // ─── M1 ────────────────────────────────────────────────────────────────────
  makeCase(
    "A1",
    "named counterexample turned into a falsifiable prediction — evidence asserted, not shown",
    { band: [8, 9], verdict: "ok", splitDirection: "against" },
    {
      motion: M1, side: "against", author: "dev",
      ownAnalysis: M1_AGAINST, opponentAnalysis: M1_FOR, ownIsFirst: false,
      ownSideArguments: M1_AGAINST_ARGS, priorAffirmative: 55, priorNegative: 45,
      argument:
        "ambient observation is a story senior people tell themselves. GitLab has been all-remote since 2011 and promotes juniors to staff on the same curve as its hybrid competitors — if osmosis mattered you'd see a gap in the promotion data and there isn't one",
      replyTo: { username: "maya", content: "Juniors lose the ambient observation that builds judgment." },
    },
  ),
  makeCase(
    "A2",
    "engages the exact claim, but the only support is a personal anecdote",
    { band: [3, 5], verdict: "ok" },
    {
      motion: M1, side: "against", author: "ali",
      ownAnalysis: M1_AGAINST, opponentAnalysis: M1_FOR, ownIsFirst: false,
      ownSideArguments: M1_AGAINST_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument: "i dont think thats true, many people learn fine remote, i learned everything remote myself and im doing ok",
      replyTo: { username: "maya", content: "Juniors lose the ambient observation that builds judgment." },
    },
  ),
  makeCase(
    "A3",
    "excellent standalone — a new mechanism, engaging nobody. Judged high, then capped to 7",
    { band: [7, 9], verdict: "ok", splitDirection: "for" },
    {
      motion: M1, side: "for", author: "sam",
      ownAnalysis: M1_FOR, opponentAnalysis: M1_AGAINST, ownIsFirst: false,
      ownSideArguments: M1_FOR_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument:
        "The mechanism isn't osmosis, it's interruption cost. In an office a junior asks a 15-second question at a 15-second price. Remote, that same question costs a scheduled call — so they don't ask, and they ship the wrong thing for two days instead.",
      replyTo: null,
    },
  ),
  makeCase(
    "A4",
    "methodological rebuttal — no data of its own, and needs none",
    { band: [8, 10], verdict: "ok", splitDirection: "for" },
    {
      motion: M1, side: "for", author: "maya",
      ownAnalysis: M1_FOR, opponentAnalysis: M1_AGAINST, ownIsFirst: false,
      ownSideArguments: M1_FOR_ARGS, priorAffirmative: 45, priorNegative: 55,
      argument:
        "GitLab is a self-selected sample. People who thrive remote apply to an all-remote company; people who need mentorship don't apply or don't last. Your promotion curve measures survivors, not the effect.",
      replyTo: { username: "dev", content: "GitLab promotes juniors on the same curve, the data shows no gap." },
    },
  ),
  makeCase(
    "A5",
    "fluent, confident, and arguing something adjacent to the motion rather than the motion",
    { band: [2, 4], verdict: "ok", splitDirection: "flat" },
    {
      motion: M1, side: "against", author: "lena",
      ownAnalysis: M1_AGAINST, opponentAnalysis: M1_FOR, ownIsFirst: false,
      ownSideArguments: M1_AGAINST_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument:
        "Remote work is here to stay whether we like it or not, and companies that fail to adapt will lose the talent war. The future of work is distributed, and clinging to the office is nostalgia dressed up as management.",
      replyTo: null,
    },
  ),

  // ─── M2 ────────────────────────────────────────────────────────────────────
  makeCase(
    "A6",
    "analogy that draws a real legal distinction — lands, but the analogy is arguable",
    { band: [7, 9], verdict: "ok", splitDirection: "for" },
    {
      motion: M2, side: "for", author: "riya",
      ownAnalysis: M2_FOR, opponentAnalysis: M2_AGAINST, ownIsFirst: false,
      ownSideArguments: M2_FOR_ARGS, priorAffirmative: 48, priorNegative: 52,
      argument:
        "It doesn't collapse — the line already exists in law. A bookstore isn't liable for what's on the shelf but is liable for what it puts in the window display. Ranking is the window.",
      replyTo: { username: "kai", content: "Liability for amplification collapses into liability for hosting." },
    },
  ),
  makeCase(
    "A7",
    "rough English, real distinction, asserted rather than developed — grammar must not cost it",
    { band: [5, 7], verdict: "ok" },
    {
      motion: M2, side: "against", author: "kai",
      ownAnalysis: M2_AGAINST, opponentAnalysis: M2_FOR, ownIsFirst: false,
      ownSideArguments: M2_AGAINST_ARGS, priorAffirmative: 52, priorNegative: 48,
      argument:
        "editorial choice means a human decide. algorithm is not human, it is math on engagement signal, no editor sitting there. so your comparison is wrong from start.",
      replyTo: { username: "riya", content: "Amplification is an editorial choice, and editors are liable." },
    },
  ),
  makeCase(
    "A8",
    "true and relevant, but an observation rather than an argument",
    { band: [4, 6], verdict: "ok" },
    {
      motion: M2, side: "for", author: "sam",
      ownAnalysis: M2_FOR, opponentAnalysis: M2_AGAINST, ownIsFirst: false,
      ownSideArguments: M2_FOR_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument:
        "Section 230 was written in 1996 for message boards. It's absurd that a law drafted before the recommendation engine existed is the law that governs the recommendation engine.",
      replyTo: null,
    },
  ),
  makeCase(
    "A9",
    "steelman then reductio with a concrete consequence — correct, specific, unanswered",
    { band: [8, 10], verdict: "ok", splitDirection: "against" },
    {
      motion: M2, side: "against", author: "kai",
      ownAnalysis: M2_AGAINST, opponentAnalysis: M2_FOR, ownIsFirst: false,
      ownSideArguments: M2_AGAINST_ARGS, priorAffirmative: 55, priorNegative: 45,
      argument:
        "Take it seriously for one second: if ranking creates liability, every platform's rational move is to rank by recency only. That's not a neutral internet, that's an internet where the loudest and most frequent poster wins. You'd amplify spam by law.",
      replyTo: { username: "riya", content: "Amplification is an editorial choice, and editors are liable." },
    },
  ),
  makeCase(
    "A10",
    "harsh but AT THE ARGUMENT, and repeats @kai's distinction while adding an unmet burden — NOT abuse, NOT a restatement",
    { band: [3, 5], verdict: "ok" },
    {
      motion: M2, side: "against", author: "bo",
      ownAnalysis: M2_AGAINST, opponentAnalysis: M2_FOR, ownIsFirst: false,
      ownSideArguments: [
        ...M2_AGAINST_ARGS,
        { id: 213, username: "kai", content: "editorial choice means a human decide. algorithm is not human, it is math on engagement signal." },
      ],
      priorAffirmative: 50, priorNegative: 50,
      argument:
        'this is garbage reasoning. you keep saying "editorial" like repeating it makes it true. an editor picks. a model predicts. you have not once explained why prediction is picking.',
      replyTo: { username: "riya", content: "Amplification is an editorial choice, and editors are liable." },
    },
  ),

  // ─── M3 ────────────────────────────────────────────────────────────────────
  makeCase(
    "A11",
    "code-switched Hindi — separates two conflated concepts and supplies a figure. Decode past the language",
    { band: [8, 10], verdict: "ok", splitDirection: "for" },
    {
      motion: M3, side: "for", author: "priya",
      ownAnalysis: M3_FOR, opponentAnalysis: M3_AGAINST, ownIsFirst: false,
      ownSideArguments: M3_FOR_ARGS, priorAffirmative: 47, priorNegative: 53,
      argument:
        "fair aur accurate dono alag cheez hai. aap keh rahe ho ye fair hai kyunki sab ko same paper milta hai — but coaching industry 60000 crore ki hai, matlab paper same hai but preparation same nahi hai. to fairness bhi nahi bachi.",
      replyTo: { username: "arun", content: "Standardized recall is the fairest scalable filter for twenty million applicants." },
    },
  ),
  makeCase(
    "A12",
    "fluent, emotive, and off-motion: the cost of exams is not what exams measure",
    { band: [2, 4], verdict: "ok", splitDirection: "flat" },
    {
      motion: M3, side: "for", author: "kim",
      ownAnalysis: M3_FOR, opponentAnalysis: M3_AGAINST, ownIsFirst: false,
      ownSideArguments: M3_FOR_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument:
        "The exam system in India is deeply flawed and needs urgent reform. Millions of students suffer immense pressure, and the mental health crisis among aspirants is well documented. We must move toward a more holistic model of assessment.",
      replyTo: null,
    },
  ),
  makeCase(
    "A13",
    "strong standalone: names the alternatives, gives a mechanism, and names the gap in the other case",
    { band: [7, 9], verdict: "ok", splitDirection: "against" },
    {
      motion: M3, side: "against", author: "arun",
      ownAnalysis: M3_AGAINST, opponentAnalysis: M3_FOR, ownIsFirst: false,
      ownSideArguments: [{ id: 222, username: "arun", content: "An anonymous common paper is the least corruptible instrument at that scale." }],
      priorAffirmative: 55, priorNegative: 45,
      argument:
        "Every proposed alternative — essays, interviews, portfolios — has more room for bias, not less. In a country where your surname still moves outcomes, an anonymous MCQ is the least corruptible instrument we have. The critique never names a replacement that survives contact with twenty million applicants.",
      replyTo: null,
    },
  ),

  // ─── M4 ────────────────────────────────────────────────────────────────────
  makeCase(
    "A14",
    "specific dated evidence against the stated mechanism — lands, but overclaims what the trial showed",
    { band: [7, 9], verdict: "ok", splitDirection: "against" },
    {
      motion: M4, side: "against", author: "dev",
      ownAnalysis: M4_AGAINST, opponentAnalysis: M4_FOR, ownIsFirst: false,
      ownSideArguments: M4_AGAINST_ARGS, priorAffirmative: 55, priorNegative: 45,
      argument:
        "the Finland trial ran 2017-2018 with 2000 unemployed people and employment days went slightly UP, not down. your mechanism predicts the opposite of what actually happened.",
      replyTo: { username: "sam", content: "Cash without conditions weakens the wage floor's pull." },
    },
  ),
  makeCase(
    "A15",
    "the own side's existing case, reworded, adding nothing — the restatement floor",
    { band: [2, 2], verdict: "ok", splitDirection: "flat" },
    {
      motion: M4, side: "against", author: "kip",
      ownAnalysis: M4_AGAINST, opponentAnalysis: M4_FOR, ownIsFirst: false,
      ownSideArguments: M4_AGAINST_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument:
        "All the pilot programmes we have data on show that employment levels either stayed flat or went up. The incentive worry just isn't supported by the evidence we have.",
      replyTo: null,
    },
  ),
  makeCase(
    "A16",
    "closes the line of argument: the trial could not have tested the claim. The only 10 on the sheet",
    { band: [9, 10], verdict: "ok", splitDirection: "for" },
    {
      motion: M4, side: "for", author: "sam",
      ownAnalysis: M4_FOR, opponentAnalysis: M4_AGAINST, ownIsFirst: false,
      ownSideArguments: M4_FOR_ARGS, priorAffirmative: 45, priorNegative: 55,
      argument:
        "Finland gave 560 euro a month to unemployed people already receiving benefits — that's not a basic income, it's a paperwork change. Nobody in that trial could actually live on it. You cannot test whether a livable income reduces work by handing out an unlivable one.",
      replyTo: { username: "dev", content: "the Finland trial showed employment days went slightly up" },
    },
  ),
  makeCase(
    "A17",
    "opener, opponent still empty — real mechanism, honestly conceded as unproven. Uncapped",
    { band: [6, 8], verdict: "ok" },
    {
      motion: M4, side: "for", author: "noor",
      ownAnalysis: "", opponentAnalysis: "", ownIsFirst: true,
      ownSideArguments: [], priorAffirmative: 50, priorNegative: 50,
      argument:
        "Work isn't only income, it's structure and status — but those are downstream of need. Remove need and you find out how much of the workforce was there for the other two. My claim is that the number is smaller than we'd like to believe, and no trial short enough to fund has ever run long enough to find out.",
      replyTo: null,
    },
  ),

  // ─── M5 ────────────────────────────────────────────────────────────────────
  makeCase(
    "A18",
    "correct, specific, mechanistic — destroys the 'same tech one step earlier' framing",
    { band: [8, 10], verdict: "ok", splitDirection: "against" },
    {
      motion: M5, side: "against", author: "tomas",
      ownAnalysis: M5_AGAINST, opponentAnalysis: M5_FOR, ownIsFirst: false,
      ownSideArguments: M5_AGAINST_ARGS, priorAffirmative: 55, priorNegative: 45,
      argument:
        "It is not the same thing one step earlier. Somatic edits die with the patient. Germline edits enter the gene pool, so every off-target effect becomes heritable and the error rate compounds across generations instead of ending with one consenting adult.",
      replyTo: { username: "noor", content: "Somatic editing already treats sickle cell — the same technology one step earlier." },
    },
  ),
  makeCase(
    "A19",
    "rough English, real consistency argument, standalone — a familiar move, well made",
    { band: [6, 8], verdict: "ok" },
    {
      motion: M5, side: "for", author: "eze",
      ownAnalysis: M5_FOR, opponentAnalysis: M5_AGAINST, ownIsFirst: false,
      ownSideArguments: M5_FOR_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument:
        "we already do embryo selection in IVF and nobody call that playing god. editing is just selection with a better tool. same goal, different method — so the moral objection is not consistent.",
      replyTo: null,
    },
  ),
  makeCase(
    "A20",
    "long, fluent, both-sides, takes no position on its own side's motion — eloquence is not a score",
    { band: [2, 4], verdict: "ok", splitDirection: "flat" },
    {
      motion: M5, side: "for", author: "gus",
      ownAnalysis: M5_FOR, opponentAnalysis: M5_AGAINST, ownIsFirst: false,
      ownSideArguments: M5_FOR_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument:
        "This is a genuinely difficult question and thoughtful people land on both sides of it. On one hand we must respect autonomy; on the other, the suffering caused by heritable disease is immense and cannot be dismissed. Perhaps the answer lies in a carefully regulated middle path where oversight bodies weigh each case on its merits, ensuring that we neither rush ahead recklessly nor deny families relief that science can now provide.",
      replyTo: { username: "tomas", content: "Consent is impossible for a person who does not yet exist." },
    },
  ),

  // ─── The refusal line ────────────────────────────────────────────────────────
  // A21 and A23 are shorter than MIN_ARGUMENT_CHARS and never reach the model in
  // production. They are kept here so the model's own gate is tested on them too:
  // the two layers must agree, or the cheap one is hiding a hole in the real one.
  makeCase(
    "A21",
    "bare agreement — refused. In production the length floor catches this first",
    { band: [0, 0], verdict: "no_argument" },
    {
      motion: M5, side: "for", author: "gus",
      ownAnalysis: M5_FOR, opponentAnalysis: M5_AGAINST, ownIsFirst: false,
      ownSideArguments: M5_FOR_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument: "yes exactly, this is what i have been saying",
      replyTo: { username: "tomas", content: "Consent is impossible for a person who does not yet exist." },
    },
  ),
  makeCase(
    "A22",
    "THE boundary case: long, fluent, wholehearted, and containing no claim. Length is not effort",
    { band: [0, 0], verdict: "no_argument" },
    {
      motion: M5, side: "for", author: "gus",
      ownAnalysis: M5_FOR, opponentAnalysis: M5_AGAINST, ownIsFirst: false,
      ownSideArguments: M5_FOR_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument:
        "I completely and wholeheartedly agree with everything stated above, and I think this point deserves far more attention than it has received in this discussion so far.",
      replyTo: { username: "tomas", content: "Consent is impossible for a person who does not yet exist." },
    },
  ),
  makeCase(
    "A23",
    "bare negation — taking a side is not giving a reason",
    { band: [0, 0], verdict: "no_argument" },
    {
      motion: M5, side: "against", author: "bo",
      ownAnalysis: M5_AGAINST, opponentAnalysis: M5_FOR, ownIsFirst: false,
      ownSideArguments: M5_AGAINST_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument: "no this is wrong",
      replyTo: { username: "noor", content: "Somatic editing already treats sickle cell — the same technology one step earlier." },
    },
  ),
  makeCase(
    "A24",
    "the narrowest case: asserts evidence exists without naming any. Still not an argument",
    { band: [0, 0], verdict: "no_argument" },
    {
      motion: M5, side: "against", author: "bo",
      ownAnalysis: M5_AGAINST, opponentAnalysis: M5_FOR, ownIsFirst: false,
      ownSideArguments: M5_AGAINST_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument: "wrong. the data says otherwise.",
      replyTo: { username: "noor", content: "Somatic editing already treats sickle cell — the same technology one step earlier." },
    },
  ),

  // ─── Abuse, kept from the old set: the line is the argument vs the person ────
  makeCase(
    "A25",
    "attacks the person, not the argument — discarded",
    { band: [0, 0], verdict: "abuse" },
    {
      motion: M5, side: "against", author: "raj",
      ownAnalysis: M5_AGAINST, opponentAnalysis: M5_FOR, ownIsFirst: false,
      ownSideArguments: M5_AGAINST_ARGS, priorAffirmative: 50, priorNegative: 50,
      argument: "this is textbook biotech-lobby propaganda, do some reading before you post",
      replyTo: { username: "noor", content: "Somatic editing already treats sickle cell — the same technology one step earlier." },
    },
  ),
];

export interface ArbiterCase {
  id: string;
  content: string;
  domain: string;
  expect: { eligibility: "pass" | "fail" };
  note: string;
}

export const ARBITER_CASES: ArbiterCase[] = [
  { id: "arb-01", content: "I think social media is kind of bad for people maybe", domain: "Science", expect: { eligibility: "pass" }, note: "fluent, hedged, arguable" },
  { id: "arb-02", content: "exam system in india only test memory not real intelligence, should change", domain: "auto", expect: { eligibility: "pass" }, note: "non-native charity — real idea, rough English" },
  { id: "arb-03", content: "is ai going to take our jobs or no", domain: "Technology & AI", expect: { eligibility: "fail" }, note: "a question, not a claim" },
  { id: "arb-04", content: "water boils at 100 degrees celsius at sea level", domain: "Science", expect: { eligibility: "fail" }, note: "undisputed fact" },
  { id: "arb-05", content: "pizza is the best food ever", domain: "Society & Culture", expect: { eligibility: "fail" }, note: "pure personal taste" },
  { id: "arb-06", content: "rich country pollute more before industrial time so they should pay more for climate change", domain: "auto", expect: { eligibility: "pass" }, note: "non-native, genuinely arguable (climate reparations)" },
  { id: "arb-07", content: "life is hard sometimes", domain: "auto", expect: { eligibility: "fail" }, note: "too vague to argue even after repair" },
  { id: "arb-08", content: "everyone who disagrees with me is a worthless idiot who should be silenced", domain: "auto", expect: { eligibility: "fail" }, note: "offensive, no intellectual merit" },
];
