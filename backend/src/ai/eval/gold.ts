/**
 * GOLD — the hand-labeled eval set for the judging personas.
 *
 * Decision (d) of the AI judgment overhaul: "accurate" is a measured property.
 * These are the cases the product owner sanity-checked; `run.ts` sends each
 * through the real prompt and checks the model's output against `expect`.
 *
 * Because a temp-0.2 flash model is stochastic, scoring bands are RANGES and
 * probability checks are DIRECTIONAL — never exact matches. The point is to
 * catch drift (a fluency-biased score, an over-swinging bar, a mis-gated
 * statement), not to pin a stochastic judge to a single number.
 *
 * Run:  npm run eval           (one pass)
 *       npm run eval -- --runs=3   (majority-of-N, smooths the jitter)
 */
import type { AnalystPromptInput, ProbabilityPromptInput } from "../analyst.logic.js";

const STATEMENT = "Nuclear power is the only realistic path to decarbonize the grid.";

const FOR_ANALYSIS =
  "Nuclear is the only baseload that scales to civilizational demand.\n\n### Key Arguments\n- **@maya** — only nuclear delivers 24/7 baseload at the scale decarbonization needs";
const AGAINST_ANALYSIS =
  "Nuclear is too slow and too costly to scale in time.\n\n### Key Arguments\n- **@arjun** — a single plant takes over 12 years to build";

// ── Scoring cases ────────────────────────────────────────────────────────────
// Asserted on scoreComment(...).judged (the model's 1-8 after clamp). The cap
// and halving are deterministic code, already covered by analyst.logic.test.ts.

export interface ScoringCase {
  id: string;
  input: AnalystPromptInput;
  expect: { band: [number, number]; abused?: boolean };
  note: string;
}

export const SCORING_CASES: ScoringCase[] = [
  {
    id: "score-01",
    note: "specific evidenced rebuttal, broken English — the top of the scale",
    expect: { band: [7, 8] },
    input: {
      statement: STATEMENT,
      side: "against",
      author: "dev",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment:
        "u say only nuclear scale but france 1980 build 56 reactor in 15 year and still 70% grid. so scaling possible yes but that was state monopoly + cheap debt, today no country have that. so 'only' is false",
      replyTo: { username: "maya", content: "Nuclear is the only baseload that scales." },
    },
  },
  {
    id: "score-02",
    note: "clean reframe that engages no one — insight, a notch below a landed hit",
    expect: { band: [5, 6] },
    input: {
      statement: STATEMENT,
      side: "for",
      author: "sam",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment:
        "everyone argues about nuclear cost and build time but the real question is what carries baseload at 3am with no wind and no sun. nobody against nuclear has answered that.",
      replyTo: null,
    },
  },
  {
    id: "score-03",
    note: "polished generalist, fluent and empty — eloquence is not a score",
    expect: { band: [1, 3] },
    input: {
      statement: STATEMENT,
      side: "against",
      author: "lena",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment:
        "While nuclear power undeniably offers impressive energy density and a commendable safety profile, we must weigh the broader socio-economic and environmental ramifications of over-reliance on any single technology in our pursuit of a sustainable energy future.",
      replyTo: { username: "maya", content: "Nuclear is the only baseload that scales." },
    },
  },
  {
    id: "score-04",
    note: "personal attack, not an argument — discarded",
    expect: { band: [1, 8], abused: true },
    input: {
      statement: STATEMENT,
      side: "against",
      author: "raj",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment: "this is textbook nuclear-lobby propaganda, do some reading before you post",
      replyTo: { username: "maya", content: "Nuclear is the only baseload that scales." },
    },
  },
  {
    id: "score-05",
    note: "blunt non-native jab AT THE ARGUMENT — not abuse, a partial rebuttal",
    expect: { band: [3, 4], abused: false },
    input: {
      statement: STATEMENT,
      side: "against",
      author: "ali",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment: "this logic is stupid, u ignore the cost completely, nuclear is most expensive per MWh",
      replyTo: { username: "maya", content: "Nuclear is the only baseload that scales." },
    },
  },
  {
    id: "score-06",
    note: "romanized-Hindi code-switch, specific counter — decode past the language",
    expect: { band: [6, 8] },
    input: {
      statement: STATEMENT,
      side: "against",
      author: "priya",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment:
        "aap bolte ho nuclear safe hai but Chernobyl aur Fukushima dono me government ne death toll chupaya, real numbers bahut zyada hai",
      replyTo: { username: "maya", content: "Nuclear is the safest energy source per terawatt-hour." },
    },
  },
  {
    id: "score-07",
    note: "vague gesture at real concerns, none developed — decode-strict low-mid",
    expect: { band: [2, 4] },
    input: {
      statement: STATEMENT,
      side: "against",
      author: "tomas",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment: "nuclear no good, waste stay 1000 year, my country no place for this, politics also problem, better sun and wind na",
      replyTo: null,
    },
  },
  {
    id: "score-08",
    note: "restates a point already in the own analysis — no movement",
    expect: { band: [1, 3] },
    input: {
      statement: STATEMENT,
      side: "against",
      author: "kim",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment: "nuclear takes too long to build, more than a decade, so it cannot help in time",
      replyTo: null,
    },
  },
  {
    id: "score-09",
    note: "strong specific opener, opponent still empty — opener exception, can reach 8",
    expect: { band: [6, 8] },
    input: {
      statement: STATEMENT,
      side: "for",
      author: "noor",
      forAnalysis: null,
      againstAnalysis: null,
      ownIsFirst: true,
      comment:
        "nuclear has the highest capacity factor of any source, over 90%, meaning one plant runs near full output all year, which no renewable matches without storage",
      replyTo: null,
    },
  },
  {
    id: "score-10",
    note: "new angle via analogy, opponent present — substance scores high before the cap",
    expect: { band: [6, 8] },
    input: {
      statement: STATEMENT,
      side: "for",
      author: "eze",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment:
        "think of the grid like an ICU — you can't run life support on 'mostly reliable' power. baseload isn't about average supply, it's about a guaranteed floor, and that is exactly what intermittent renewables can't promise",
      replyTo: null,
    },
  },
  {
    id: "score-11",
    note: "reply that answers a DIFFERENT point than the one raised — near it, not to it",
    expect: { band: [3, 4] },
    input: {
      statement: STATEMENT,
      side: "against",
      author: "bo",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment: "nuclear accidents are scary and people don't want plants near where they live",
      replyTo: { username: "maya", content: "Nuclear is the only baseload that scales." },
    },
  },
  {
    id: "score-12",
    note: "no real claim — decoded_claim should be empty, floor score",
    expect: { band: [1, 2] },
    input: {
      statement: STATEMENT,
      side: "for",
      author: "gus",
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      ownIsFirst: false,
      comment: "i agree, nice point",
      replyTo: null,
    },
  },
];

// ── Arbiter cases ────────────────────────────────────────────────────────────

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

// ── Probability cases ────────────────────────────────────────────────────────
// move = round(affirmative) - priorAffirmative. "flat" means |move| <= maxMove.

export interface ProbabilityCase {
  id: string;
  input: ProbabilityPromptInput;
  expect: { direction: "for" | "against" | "flat"; maxMove: number };
  note: string;
}

export const PROBABILITY_CASES: ProbabilityCase[] = [
  {
    id: "prob-01",
    note: "a specific hit lands for AGAINST — the bar should move that way",
    expect: { direction: "against", maxMove: 12 },
    input: {
      statement: STATEMENT,
      priorAffirmative: 50,
      priorNegative: 50,
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      latest: {
        username: "dev",
        side: "against",
        content:
          "France's 56 reactors in 15 years only happened under a state monopoly with cheap debt no country has today, so 'only realistic path' is false",
      },
    },
  },
  {
    id: "prob-02",
    note: "vague restatement — nothing lands, the bar should hold",
    expect: { direction: "flat", maxMove: 2 },
    input: {
      statement: STATEMENT,
      priorAffirmative: 55,
      priorNegative: 45,
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      latest: { username: "sam", side: "for", content: "nuclear is really the best option honestly, everyone knows this" },
    },
  },
  {
    id: "prob-03",
    note: "FOR lands a specific rebuttal — the bar should move toward FOR",
    expect: { direction: "for", maxMove: 10 },
    input: {
      statement: STATEMENT,
      priorAffirmative: 40,
      priorNegative: 60,
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      latest: {
        username: "maya",
        side: "for",
        content:
          "storage for a full week of grid demand would cost more than the entire nuclear fleet — the AGAINST cost argument quietly ignores storage cost",
      },
    },
  },
  {
    id: "prob-04",
    note: "fluent generic essay — no substance, the bar should hold",
    expect: { direction: "flat", maxMove: 2 },
    input: {
      statement: STATEMENT,
      priorAffirmative: 50,
      priorNegative: 50,
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      latest: {
        username: "lena",
        side: "against",
        content:
          "We must weigh the broader socio-economic and environmental ramifications of over-reliance on any single technology in our pursuit of a sustainable future.",
      },
    },
  },
  {
    id: "prob-05",
    note: "strong AGAINST point from a near-edge lead — must move but hold the 20-80 floor",
    expect: { direction: "against", maxMove: 12 },
    input: {
      statement: STATEMENT,
      priorAffirmative: 78,
      priorNegative: 22,
      forAnalysis: FOR_ANALYSIS,
      againstAnalysis: AGAINST_ANALYSIS,
      latest: {
        username: "arjun",
        side: "against",
        content:
          "after 70 years there is still no permanent waste storage operating anywhere on earth — that is an unanswered structural problem, not a detail",
      },
    },
  },
  {
    id: "prob-06",
    note: "loaded topic, weak appeal-to-popularity — must NOT drift to the conventional view",
    expect: { direction: "flat", maxMove: 3 },
    input: {
      statement: "God exists.",
      priorAffirmative: 50,
      priorNegative: 50,
      forAnalysis: "The universe shows fine-tuning and moral order that point to a designer.",
      againstAnalysis: "Existence claims carry the burden of proof, and none has been met.",
      latest: { username: "sam", side: "for", content: "well most people in the world believe in God so it must be true" },
    },
  },
];
