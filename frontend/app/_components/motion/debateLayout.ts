// The debate page's outer geometry, in one place.
//
// Three separate elements have to agree on it — the arena (DebateView), the
// sticky composer under it (ArgumentInput), and the route skeleton
// (motion/[id]/loading.tsx) — and they are siblings rather than nested, so
// there is nowhere in the tree to put it. When they drifted apart the skeleton
// laid out at a different width from the page it was standing in for, and every
// reload of a debate ended with the content jumping sideways.

/** The x-padding ramp. The composer's field must start on the same line as the
 *  case it posts into, and the skeleton on the same line as both. */
export const DEBATE_GUTTER = "px-6 md:px-10 lg:px-16 xl:px-20";

/** The arena's own shell — also what the route skeleton must render into.
 *
 *  `w-full` is not decoration. This is a flex item in a `flex-col` main, and an
 *  auto margin on the cross axis (`mx-auto`) suppresses `align-self: stretch` —
 *  without a definite width the section shrink-wraps its content and centres,
 *  which is exactly how the skeleton ended up 464px wide inside a 1440px page.
 *  `grow` lets the arena absorb the page's spare height so the sticky composer
 *  sits on the fold even when nobody has argued yet. */
export const DEBATE_SHELL = `grow w-full max-w-screen-2xl mx-auto ${DEBATE_GUTTER} pt-12 pb-16`;
