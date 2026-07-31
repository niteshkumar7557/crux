# Crux judgment eval — the motion/argument rename

**Date:** 2026-07-28
**Model:** deepseek/deepseek-v4-flash:nitro (via OpenRouter)
**Command:** `npm run eval -- --runs=3`
**Why:** the rename changed the labelled blocks the model reads (`STATEMENT:` →
`MOTION:`, `COMMENT:` → `ARGUMENT:`, `OWN SIDE COMMENTS` → `OWN SIDE ARGUMENTS`,
`YOUR COMMENT ID` → `YOUR ARGUMENT ID`, `SCORED COMMENTS` → `SCORED ARGUMENTS`),
the instruction prose, and the `commentId` → `argumentId` key in the analysis
JSON. That is a prompt change, so it needs a measurement, not an opinion.

Both sides were run at `--runs=3` on the **same 28 cases**, back to back, on the
same model. The "before" side is a clean `git archive HEAD` of the pre-rename
tree — not a partial revert — so the only variable is the wording.

| | before (HEAD) | after (renamed) |
|---|---|---|
| Scoring | 14/14 | **13/14** |
| Arbiter | 8/8 | 8/8 |
| Probability | 6/6 | 6/6 |
| **Total** | **28/28** | **27/28** |

## The one case that moved

```
FAIL  score-06  0/3   judged=5 abused=false (want 6-8)
      romanized-Hindi code-switch, specific counter — decode past the language
```

Read it with the history, not cold:

- In the **recorded 2026-07-24 baseline** (`2026-07-24-deepseek-v4-flash.md`,
  1 run/case) `score-06` was the *single* failing case — it is where the 25/26
  in that file came from.
- In the pre-rename `--runs=3` baseline taken here it passed **2 of 3** — a
  majority pass, not a solid one.
- After the rename it is **0 of 3**.

So this is the set's known-marginal case tipping over, not a broad accuracy
loss: every other case, including the other non-native-English ones (`score-05`,
`arb-02`, `arb-06`), holds at 3/3. It is still a real move on the hardest
decode-past-the-language case, which is the property the judgment overhaul
exists to protect — so it is written down here rather than rounded off.

## Note on the denominator

`2026-07-24-deepseek-v4-flash.md` records **25/26**. The gold set has since
grown to **28** cases (14 scoring, not 12), so that number is not comparable to
anything current. The 28/28 above is the honest pre-rename baseline.

## If this needs to be undone

The prompt-facing change is self-contained: the emitted labels in
`ai/analyst.logic.ts`, `ai/verdict.ts`, `controllers/argument.controller.ts` and
`ai/eval/run.ts`, the prose in `ai/prompts/*.prompt.ts`, and the `argumentId`
key. The emitter, the prompt and the parser in `ai/analysis.logic.ts` are one
contract — reverting the prompt without the parser silently drops every point's
author attribution, and no type checker catches it. Move all three or none.
