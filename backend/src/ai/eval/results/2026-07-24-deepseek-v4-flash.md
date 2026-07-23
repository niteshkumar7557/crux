# Crux judgment eval — baseline

**Date:** 2026-07-24  
**Model:** deepseek/deepseek-v4-flash (via OpenRouter)  
**Command:** `npm run eval`

Scoring bands are ranges and probability is directional — the judge is stochastic (temp 0.2). A FAIL row shows the model output vs. the expected label. Re-run after any prompt or model change and compare.

```

> crux-backend@1.0.0 eval
> npx tsx src/ai/eval/run.ts

Crux judgment eval · 1 run(s)/case · model deepseek/deepseek-v4-flash

SCORING (asserted on judged 1-8)
  PASS  score-01  1/1   judged=8 abused=false (want 7-8)         specific evidenced rebuttal, broken English — the top of the scale
  PASS  score-02  1/1   judged=6 abused=false (want 5-6)         clean reframe that engages no one — insight, a notch below a landed hit
  PASS  score-03  1/1   judged=2 abused=false (want 1-3)         polished generalist, fluent and empty — eloquence is not a score
  PASS  score-04  1/1   abused=true (want true)                  personal attack, not an argument — discarded
  PASS  score-05  1/1   judged=4 abused=false (want 3-4)         blunt non-native jab AT THE ARGUMENT — not abuse, a partial rebuttal
  FAIL  score-06  0/1   judged=5 abused=false (want 6-8)         romanized-Hindi code-switch, specific counter — decode past the language
  PASS  score-07  1/1   judged=2 abused=false (want 2-4)         vague gesture at real concerns, none developed — decode-strict low-mid
  PASS  score-08  1/1   judged=2 abused=false (want 1-3)         restates a point already in the own analysis — no movement
  PASS  score-09  1/1   judged=6 abused=false (want 6-8)         strong specific opener, opponent still empty — opener exception, can reach 8
  PASS  score-10  1/1   judged=6 abused=false (want 6-8)         new angle via analogy, opponent present — substance scores high before the cap
  PASS  score-11  1/1   judged=4 abused=false (want 3-4)         reply that answers a DIFFERENT point than the one raised — near it, not to it
  PASS  score-12  1/1   judged=1 abused=false (want 1-2)         no real claim — decoded_claim should be empty, floor score
  — 11/12

ARBITER (pass/fail gate)
  PASS  arb-01    1/1   eligibility=pass (want pass)             fluent, hedged, arguable
  PASS  arb-02    1/1   eligibility=pass (want pass)             non-native charity — real idea, rough English
  PASS  arb-03    1/1   eligibility=fail (want fail)             a question, not a claim
  PASS  arb-04    1/1   eligibility=fail (want fail)             undisputed fact
  PASS  arb-05    1/1   eligibility=fail (want fail)             pure personal taste
  PASS  arb-06    1/1   eligibility=pass (want pass)             non-native, genuinely arguable (climate reparations)
  PASS  arb-07    1/1   eligibility=fail (want fail)             too vague to argue even after repair
  PASS  arb-08    1/1   eligibility=fail (want fail)             offensive, no intellectual merit
  — 8/8

PROBABILITY (direction + max move from prior)
  PASS  prob-01   1/1   50→44 move=-6 (want against ≤12)         a specific hit lands for AGAINST — the bar should move that way
  PASS  prob-02   1/1   55→55 move=+0 (want flat ≤2)             vague restatement — nothing lands, the bar should hold
  PASS  prob-03   1/1   40→45 move=+5 (want for ≤10)             FOR lands a specific rebuttal — the bar should move toward FOR
  PASS  prob-04   1/1   50→50 move=+0 (want flat ≤2)             fluent generic essay — no substance, the bar should hold
  PASS  prob-05   1/1   78→70 move=-8 (want against ≤12)         strong AGAINST point from a near-edge lead — must move but hold the 20-80 floor
  PASS  prob-06   1/1   50→50 move=+0 (want flat ≤3)             loaded topic, weak appeal-to-popularity — must NOT drift to the conventional view
  — 6/6

TOTAL: 25/26 cases within expectation
```
