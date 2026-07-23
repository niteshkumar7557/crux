/**
 * RUN — the gold eval runner. Sends every case in `gold.ts` through the real
 * prompt and checks the model's output against `expect`.
 *
 * This hits the live LLM (it costs tokens and needs LLM_API_KEY), so it is a
 * manual / CI-optional check — NOT part of `npm test`, which stays pure and
 * offline. The deterministic scoring/verdict maths is unit-tested separately.
 *
 *   npm run eval               one pass per case
 *   npm run eval -- --runs=3   run each case 3x, pass on the majority
 */
import "dotenv/config";
import { llmJson } from "../llm.js";
import { ARBITER_SYSTEM_PROMPT } from "../prompts/arbiter.prompt.js";
import { MODERATOR_ANALYST_SYSTEM_PROMPT } from "../prompts/moderator-analyst.prompt.js";
import { PROBABILITY_SYSTEM_PROMPT } from "../prompts/probability.prompt.js";
import { buildAnalystPrompt, buildProbabilityPrompt, scoreComment } from "../analyst.logic.js";
import {
  SCORING_CASES,
  ARBITER_CASES,
  PROBABILITY_CASES,
  type ScoringCase,
  type ArbiterCase,
  type ProbabilityCase,
} from "./gold.js";

type Outcome = { pass: boolean; detail: string };

async function runScoring(c: ScoringCase): Promise<Outcome> {
  const user = buildAnalystPrompt(c.input);
  const out = await llmJson<{ abused: boolean; points: number }>({
    system: MODERATOR_ANALYST_SYSTEM_PROMPT,
    user,
    maxTokens: 3000,
  });

  if (c.expect.abused) {
    return { pass: out.abused === true, detail: `abused=${out.abused} (want true)` };
  }

  const opp = c.input.side === "for" ? c.input.againstAnalysis : c.input.forAnalysis;
  const judged = scoreComment({
    rawPoints: out.points,
    isReply: c.input.replyTo != null,
    opponentHasComments: !!(opp && opp.trim()),
    priorCount: 0,
  }).judged;

  const [lo, hi] = c.expect.band;
  const pass = !out.abused && judged >= lo && judged <= hi;
  return { pass, detail: `judged=${judged} abused=${out.abused} (want ${lo}-${hi})` };
}

async function runArbiter(c: ArbiterCase): Promise<Outcome> {
  const user = `STATEMENT: "${c.content}"\nDOMAIN: "${c.domain}"`;
  const out = await llmJson<{ eligibility: string }>({
    system: ARBITER_SYSTEM_PROMPT,
    user,
    maxTokens: 2000,
  });
  return {
    pass: out.eligibility === c.expect.eligibility,
    detail: `eligibility=${out.eligibility} (want ${c.expect.eligibility})`,
  };
}

async function runProbability(c: ProbabilityCase): Promise<Outcome> {
  const user = buildProbabilityPrompt(c.input);
  const out = await llmJson<{ affirmative: number }>({
    system: PROBABILITY_SYSTEM_PROMPT,
    user,
    maxTokens: 2000,
  });
  const prior = c.input.priorAffirmative ?? 50;
  const aff = Math.round(out.affirmative);
  const move = aff - prior;

  const inBand = aff >= 20 && aff <= 80;
  const magOk = Math.abs(move) <= c.expect.maxMove;
  const dirOk =
    c.expect.direction === "flat" ? magOk : c.expect.direction === "for" ? move > 0 : move < 0;

  const sign = move >= 0 ? "+" : "";
  return {
    pass: inBand && magOk && dirOk,
    detail: `${prior}→${aff} move=${sign}${move} (want ${c.expect.direction} ≤${c.expect.maxMove})`,
  };
}

/** Run one case `runs` times; pass on the majority. Errors count as a miss. */
async function repeat(fn: () => Promise<Outcome>, runs: number) {
  let passCount = 0;
  let detail = "";
  for (let i = 0; i < runs; i++) {
    try {
      const r = await fn();
      if (r.pass) passCount++;
      detail = r.detail;
    } catch (e) {
      detail = `ERROR ${(e as Error).message?.slice(0, 50)}`;
    }
  }
  return { ok: passCount * 2 >= runs, passCount, detail };
}

function row(ok: boolean, id: string, passStr: string, detail: string, note: string) {
  const status = ok ? "PASS" : "FAIL";
  console.log(`  ${status}  ${id.padEnd(9)} ${passStr.padEnd(5)} ${detail.padEnd(40)} ${note}`);
}

async function section<T extends { id: string; note: string }>(
  title: string,
  cases: T[],
  fn: (c: T) => Promise<Outcome>,
  runs: number,
) {
  console.log(`\n${title}`);
  let pass = 0;
  for (const c of cases) {
    const r = await repeat(() => fn(c), runs);
    if (r.ok) pass++;
    row(r.ok, c.id, `${r.passCount}/${runs}`, r.detail, c.note);
  }
  console.log(`  — ${pass}/${cases.length}`);
  return { pass, total: cases.length };
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--runs="));
  const runs = arg ? Math.max(1, parseInt(arg.split("=")[1] ?? "", 10) || 1) : 1;

  console.log(
    `Crux judgment eval · ${runs} run(s)/case · model ${process.env.LLM_MODEL ?? "(unset)"}`,
  );

  const results = [
    await section("SCORING (asserted on judged 1-8)", SCORING_CASES, runScoring, runs),
    await section("ARBITER (pass/fail gate)", ARBITER_CASES, runArbiter, runs),
    await section("PROBABILITY (direction + max move from prior)", PROBABILITY_CASES, runProbability, runs),
  ];

  const pass = results.reduce((s, r) => s + r.pass, 0);
  const total = results.reduce((s, r) => s + r.total, 0);
  console.log(`\nTOTAL: ${pass}/${total} cases within expectation`);
  if (pass < total) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
