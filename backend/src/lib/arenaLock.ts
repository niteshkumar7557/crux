// One sentence of the spec, as a predicate: a debate that is not live accepts no
// writes at all — no arguments, no replies, no likes, and no un-likes. Anything
// other than "live" locks, so a status this file has never heard of fails closed.
// Spec: game-theory.md §4, §10

export function isArenaLocked(status: string): boolean {
  return status !== "live";
}
