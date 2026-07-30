# AGENTS.md

Entry point for AI coding agents working in this repo. Humans want
[`docs/codebase-guide.md`](./docs/codebase-guide.md); this is the compressed version plus the
rules that are easy to violate without noticing.

**Crux** is an AI-refereed debate platform in production. Two packages, no shared package, HTTP
between them: `backend/` (Express + raw SQL over Postgres) and `frontend/` (Next.js App Router).

## Read before you edit

1. **[`docs/game-theory.md`](./docs/game-theory.md) is the spec.** Every rule, every number (§21).
   **If any other doc, comment or piece of code disagrees with it, the spec wins.**
2. **[`docs/codebase-guide.md`](./docs/codebase-guide.md)** — the map, the request flows, and the
   checklist for changing a constant.
3. **[`docs/design-system.md`](./docs/design-system.md)** before any UI change.
4. **[`docs/future-features.md`](./docs/future-features.md)** before proposing a feature — it may
   already have a finished design, or be a recorded dead end.

Source files that implement a rule carry `Spec: game-theory.md §N` in their header. **Read the
header, then that section, then the code.**

## Non-negotiables

- **ESM `.js` import specifiers in backend TypeScript** — `import x from "./y.js"` where the file
  is `y.ts`. Required by the Node ESM setup. Do not "fix" them.
- **No ORM.** SQL is written by hand, inline in controllers. Grep a table name to find every
  touch point. Do not introduce an ORM or a repository layer.
- **Game constants are not configuration.** They live in the `*.logic.ts` modules, are asserted by
  unit tests, and are printed to users on `/rules`. Never move one into an env var. Changing one is
  a coordinated edit — spec, constant, test, UI copy, and any prompt that states it.
- **Rules are enforced server-side.** A disabled button is not a rule. Anything that changes a
  user's outcome gets a check in a controller too.
- **Any rule that can cost a user something must be visible before it bites** (spec §19). Adding a
  rule without a surface is adding a bug.
- **Untrusted input is narrowed, never cast.** LLM output and Telegram payloads arrive as
  `unknown` and are coerced field by field.
- **Pure decisions go in `*.logic.ts` with a `*.logic.test.ts` beside them.** If something is hard
  to test without mocking, that is the signal to extract it. The suite uses no module mocks, no
  fake timers, and no shared setup — inputs are injected instead.
- **Four values are duplicated across the backend/frontend boundary on purpose** (the frontend
  cannot import backend modules): `DRAW_MARGIN`, `STANDALONE_CAP`, the tier ladder, and the
  username rule. Change both sides, or the UI states a rule the server does not enforce — and both
  test suites stay green while it happens.
- **`MIN_ARGUMENT_CHARS` (`lib/validate.ts`) is deliberately backend-only and unmentioned in the
  UI.** It is the free half of the low-effort gate; naming it would teach users to pad to it. Never
  add a character counter, a length-aware disabled state, or a distinct error for it.
- **Tailwind cannot see class names built at runtime.** Colour-by-variant goes through a lookup of
  literal class strings.
- **Prompt field order is load-bearing.** Every judging prompt makes the model write its analysis
  into unread fields *before* the number it is judged on (spec §16). Reordering defeats it.

## Comment policy

The comment layer is deliberately thin. Match it:

```ts
// <one line: what this file owns>
// Spec: game-theory.md §7, §8        ← only when it implements a game rule
```

Inline comments only for a non-obvious invariant, a trust boundary, or a "this looks wrong but
isn't". Do **not** add comments that restate the code, narrate history ("this used to be X"), or
mark sections of a short file. If an explanation needs more than about four lines, it belongs in a
doc and the code gets a pointer.

## Verification

All six must pass. Run them; do not assume.

```bash
cd backend  && npm test && npx tsc --noEmit && npm run build
cd frontend && npm test && npm run lint && npx tsc --noEmit && npm run build
```

`npm run eval` (backend) scores the AI against a gold set and **spends real money** — never run it
without being asked, and never add it to CI.

## Things that will surprise you

- **Editing a migration in place is invisible to a database that already ran it.** The runner
  tracks filenames. If `db-init` prints `⏭ skipping`, your edit did not land — reset first.
- **Four pollers run in-process**, so they only run where the API runs. Single replica is a
  requirement, not a preference; the rate limiter's in-memory state assumes it too.
- **The Telegram poller is not a `setInterval`** — it long-polls, so it is a self-rescheduling
  loop with backoff.
- **`/health` sits above the rate limiter deliberately.** Do not move it.
- **The sides are FOR/AGAINST in the product and `affirmative`/`negative` in the database and API
  paths.** Both are current. Renaming is a product-wide decision, not a local cleanup.
- **`docs/developer-notes.md` is git-ignored** — it is the owner's private production runbook. Do
  not create, read into, or copy from it in committed work.

## Known gaps — recorded, not hidden

Do not "discover" these as bugs; they are listed in `docs/codebase-guide.md` §11 with context.

- The profile bio has two writers, so publishing a motion overwrites a hand-written bio.
- Two enforced rules are never disclosed to users: the author may only argue FOR their own motion,
  and you cannot like your own argument. Both are §19 violations.
- `MAIN_STAGE_SIZE` is 4 but one query hardcodes `LIMIT 6`.
- Rate-limit state is in-process memory.
