# Prompts

Every system prompt Crux sends to an LLM lives here, one persona per file. These are the live
strings — the controllers import them, so editing a file changes production behaviour. There is
no second copy to keep in sync.

| File | Persona | Fires | Cost of being wrong |
| --- | --- | --- | --- |
| `arbiter.prompt.ts` | Arbiter | user submits a statement | a bad debate gets created, or a good one is rejected |
| `opening-analyst.prompt.ts` | Opening Analyst | statement is published | both sides start from a weak case |
| `moderator-analyst.prompt.ts` | Moderator / Analyst | **every comment** | wrong points awarded; the public analysis degrades |
| `probability.prompt.ts` | Probability Judge | a comment, once both sides have argued | the live win bar swings without explanation |
| `verdict-judge.prompt.ts` | Verdict Judge | debate closes | irreversible: winner, MVP, and the logic payouts |
| `debater-profiler.prompt.ts` | Debater Profiler | statement is published (best-effort) | a bad profile line; nothing else breaks |

Each file's header comment documents what the persona does, where it is called from, the exact
user-message shape it requires, the JSON it must return, and which of those fields the code
re-validates versus takes on trust.

## Rules that apply to all six

- **JSON only.** `ai/llm.ts` sends `response_format: { type: "json_object" }` and parses through
  `jsonrepair`, retrying `LLM_RETRIES` times. Every prompt must state its exact return shape.
- **One model runs all six** (`deepseek/deepseek-v4-flash` via OpenRouter, swappable by env).
  There is no smart/fast split — a prompt that only works on a bigger model does not work.
- **Reasoning is off deliberately.** Thinking tokens are billed as output *and* counted against
  `max_tokens`, so leaving it on truncates the shorter calls into invalid JSON. Prompts must be
  answerable by rubric, not by derivation.
- **The prompt is usually the only validation.** Where code does re-check the output
  (`analyst.logic.ts`, `verdict.logic.ts`) it fixes range and eligibility, never judgement —
  see each file's downstream-contract section before loosening a constraint.
- **System prompts are static on purpose.** Nothing user-supplied is interpolated into them;
  that keeps DeepSeek's automatic prefix cache warm and keeps injection confined to the user
  message. Keep it that way.

Rules and payouts these prompts feed into are specified in `docs/CODEBASE_GUIDE.md` §6 and
`docs/game-theory.md`.
