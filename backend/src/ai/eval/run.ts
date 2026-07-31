// Scores the live prompts against gold.ts. SPENDS REAL CREDITS, so it is a manual
// gate (npm run eval) and never a CI job — which is what keeps the suite runnable
// with zero secrets. Run it before shipping any prompt change.

import "dotenv/config";
import { llmJson } from "../llm.js";
import { ARBITER_SYSTEM_PROMPT } from "../prompts/arbiter.prompt.js";
import { ARGUMENT_JUDGE_SYSTEM_PROMPT } from "../prompts/argument-judge.prompt.js";
import { buildAnalystPrompt, scoreArgument } from "../analyst.logic.js";
import {
  SCORING_CASES,
  ARBITER_CASES,
  type ScoringCase,
  type ArbiterCase,
} from "./gold.js";

type Outcome = { pass: boolean; detail: string };

// One call now returns the score AND the split, so both are asserted together.
// That is the point of the merge: a case where the score and the bar disagree —
// a restatement that still swings the split — is exactly the bug the two-call
// version could not see, because neither call knew what the other decided.
async function runScoring(c: ScoringCase): Promise<Outcome> {
  const out = await llmJson<{
    verdict: string;
    points: number;
    affirmative: number;
  }>({
    system: ARGUMENT_JUDGE_SYSTEM_PROMPT,
    user: buildAnalystPrompt(c.input),
    maxTokens: 8000,
  });

  const wantVerdict = c.expect.verdict ?? "ok";
  if (out.verdict !== wantVerdict) {
    return {
      pass: false,
      detail: `verdict=${out.verdict} (want ${wantVerdict})`,
    };
  }
  if (wantVerdict !== "ok") {
    return { pass: true, detail: `verdict=${out.verdict}` };
  }

  const opp = c.input.opponentAnalysis;
  const judged = scoreArgument({
    rawPoints: out.points,
    isReply: c.input.replyTo != null,
    opponentHasArguments: !!(opp && opp.trim()),
  }).judged;

  const [lo, hi] = c.expect.band;
  const bandOk = judged >= lo && judged <= hi;

  let splitOk = true;
  let splitDetail = "";
  if (c.expect.splitDirection) {
    const prior = c.input.priorAffirmative ?? 50;
    const move = Math.round(out.affirmative) - prior;
    splitOk =
      c.expect.splitDirection === "flat"
        ? Math.abs(move) <= 2
        : c.expect.splitDirection === "for"
          ? move > 0
          : move < 0;
    const sign = move >= 0 ? "+" : "";
    splitDetail = ` split=${sign}${move}(${c.expect.splitDirection})`;
  }

  return {
    pass: bandOk && splitOk,
    detail: `judged=${judged} (want ${lo}-${hi})${splitDetail}`,
  };
}

async function runArbiter(c: ArbiterCase): Promise<Outcome> {
  const user = `MOTION: "${c.content}"\nDOMAIN: "${c.domain}"`;
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
    await section("SCORING (judged 2-10, verdict, and split direction)", SCORING_CASES, runScoring, runs),
    await section("ARBITER (pass/fail gate)", ARBITER_CASES, runArbiter, runs),
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
