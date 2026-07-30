## What and why

<!-- One or two sentences. What changes, and what problem it solves. -->

## Checklist

- [ ] **The spec.** If this changes a rule, `docs/game-theory.md` is updated **first**, and this PR
      matches it. If it changes nothing about the rules, say so.
- [ ] **Constants.** If a `§21` number moved, I worked the checklist in `docs/codebase-guide.md`
      §8 — the constant, its test, every UI surface that states it, and any prompt that encodes
      it. I grepped both packages for the old value.
- [ ] **Disclosure.** If this adds a rule that can change a user's outcome, it is surfaced *before*
      it can bite (spec §19), not only after.
- [ ] **Tests.** New decisions live in a pure `*.logic.ts` with a test beside them.
- [ ] **The six gates pass locally**, not just in CI:
      ```
      cd backend  && npm test && npx tsc --noEmit && npm run build
      cd frontend && npm test && npm run lint && npx tsc --noEmit && npm run build
      ```

## Anything a reviewer should look at closely

<!-- A tradeoff you made, something you were unsure about, a migration, a prompt change.
     Prompt changes: say whether you ran `npm run eval` and what it scored. -->
