// The debate page's outer geometry, in one place. The arena, the sticky composer and
// the route skeleton are siblings rather than nested, so there is nowhere in the tree
// to put it — and when they drifted the page jumped sideways on every reload.

export const DEBATE_GUTTER = "px-6 md:px-10 lg:px-16 xl:px-20";

export const DEBATE_SHELL = `grow w-full max-w-screen-2xl mx-auto ${DEBATE_GUTTER} pt-12 pb-16`;
