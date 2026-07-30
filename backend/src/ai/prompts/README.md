# Prompts

Every system prompt Crux sends to an LLM lives here, one persona per file. These are the live
strings — the controllers import them, so editing a file changes production behaviour. There is
no second copy to keep in sync.

| File | Persona | Fires | Cost of being wrong |
| --- | --- | --- | --- |
| `arbiter.prompt.ts` | Arbiter | user submits a motion | a bad debate gets created, or a good one is rejected |
| `opening-brief.prompt.ts` | Opening Brief | motion is published | both sides start from a weak brief — or worse, one users can paste |
| `argument-judge.prompt.ts` | Judge | **every argument** | wrong points awarded; the public analysis degrades; the win bar moves for no reason |
| `verdict-judge.prompt.ts` | Verdict Judge | debate closes | irreversible: winner, MVP, and the logic payouts |
| `debater-profiler.prompt.ts` | Debater Profiler | motion is published (best-effort) | a bad profile line; nothing else breaks |

Each file's header documents what the persona does, where it is called from, the user-message
shape it requires, the JSON it must return, and — most importantly — **which of those fields
the code re-validates and which it takes on trust**. Read that before loosening anything.

## Rules that apply to all five

- **JSON only.** `ai/llm.ts` sends `response_format: { type: "json_object" }` and parses through
  `jsonrepair`, retrying `LLM_RETRIES` times. Every prompt must state its exact return shape.
- **One model runs all five** (`deepseek/deepseek-v4-flash` via OpenRouter, swappable by env).
  There is no smart/fast split — a prompt that only works on a bigger model does not work.
- **Reasoning is off for four of the five.** Thinking tokens are billed as output *and* counted
  against `max_tokens`, so leaving it on truncates the shorter calls into invalid JSON. Those four
  must be answerable by rubric, not by derivation. **`argument-judge` is the one exception**: it
  passes `reasoning: "high"` with an 8000-token ceiling, because it has the headroom and it is the
  call that decides what every score in the product means. Do not extend the exception without
  checking that persona's ceiling against its output size.
- **Decode first.** Because reasoning is off, every judging prompt makes the model write its
  analysis into fields the code never reads *before* it emits the number it is judged on — the
  Arbiter's `intent`, the Judge's `decoded_claim`/`engages`/`move`, the Verdict Judge's
  `mvp_reason`. This is what makes the scores blind to eloquence and to non-native English.
  **The field order is load-bearing**: move a decode field after the number it feeds and the
  mechanism is gone. In `argument-judge` this extends to the win split — `points` is emitted before
  `affirmative` precisely so the bar is bound to the score. Reorder those two, or split them back
  into two calls, and you get back a bar that moves for no visible reason.
- **`npm run eval` before shipping a prompt change.** It scores the live prompts against
  `ai/eval/gold.ts` and spends real credits, which is why it is a manual gate and not CI. The
  current bands in `gold.ts` were hand-calibrated but **have never been run against the model** —
  treat them as a statement of intent, not a passing baseline.
- **The prompt is usually the only validation.** Where code does re-check the output
  (`analyst.logic.ts`, `verdict.logic.ts`) it fixes range and eligibility, never judgement —
  see each file's downstream-contract section before loosening a constraint.
- **System prompts are static on purpose.** Nothing user-supplied is interpolated into them;
  that keeps DeepSeek's automatic prefix cache warm and keeps injection confined to the user
  message. Keep it that way.

The rules and payouts these prompts feed into are specified in `docs/game-theory.md` —
§16 for the personas, §17 for the case structure. `docs/codebase-guide.md` §6 covers the
call sites, the cost model and the flows.
