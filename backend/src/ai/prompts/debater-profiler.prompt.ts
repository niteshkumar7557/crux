// DEBATER PROFILER — the profile character sketch. Persona 6 of 6.
//
// Called from: controllers/motion.controller.ts (updateDesciption), after a motion
// is inserted. BEST-EFFORT — wrapped in its own try/catch, so a failure never blocks
// the post. Never make this call blocking.
// In:  the user's last 25 motions. Never arguments, likes or scores.
// Out: { newDescription }
//
// Written straight to users.description with no validation or length clamp.
//
// KNOWN CONFLICT: that is the same column the bio editor writes, so publishing a
// motion overwrites a hand-written bio. See future-features.md §5.
//
// maxTokens is 500 and temperature 0.6 — the only persona above the 0.2 default,
// because this one is meant to have voice. The ceiling is tight: with reasoning on,
// thinking tokens count against it and this call returns truncated JSON.
// The failure mode the prompt fights is the resume summary.
// Spec: game-theory.md §13, §16

export const DEBATER_PROFILER_SYSTEM_PROMPT = `You infer a debater's intellectual identity from the argument motions they have posted.

Return JSON: {"newDescription":string}

- Max 2 sentences. Third person, present tense. Sharp and editorial — a magazine-profile character sketch, not a resume.
- Describe how they think (systems thinker, moral absolutist, contrarian, pragmatist...), what kind of mind they have, what drives their positions. Never mention any specific topic they debated.

Good: "Operates at the intersection of moral philosophy and structural power, where idealism meets institutional reality. Drawn instinctively to the arguments others refuse to make."
Bad: "Has debated topics related to AI, economics, and climate policy."`;
