// The arena's reading unit: an exchange, not an argument. A clash is one root
// argument and its whole descendant tree.
// Spec: game-theory.md §6

import type { UserArgumentCardProps } from "@/app/motion/types";

// Display-only: how long a root stands before the arena calls it unanswered.
// NOT a game constant — it changes no outcome, is enforced nowhere, and must
// never reach /rules. It shares a number with WALKOVER_WARNING_HOURS by
// judgement rather than dependency; do not extract a shared constant.
export const UNANSWERED_AFTER_HOURS = 6;

// Root plus two levels are drawn; anything deeper collapses behind a toggle.
export const CLASH_VISIBLE_DEPTH = 2;

const HOUR_MS = 3_600_000;

export interface ClashEntry {
  argument: UserArgumentCardProps;
  depth: number;
}

export interface Clash {
  // The root's own argument_id: a clash has no identity of its own, and minting
  // one would give the DOM two ids for the same anchor.
  id: number;
  root: ClashEntry;
  entries: ClashEntry[];
  unanswered: boolean;
}

const at = (a: UserArgumentCardProps) => {
  const t = Date.parse(a.createdAt);
  return Number.isNaN(t) ? 0 : t;
};

const newestAt = (c: Clash) =>
  c.entries.reduce((max, e) => Math.max(max, at(e.argument)), at(c.root.argument));

const bestPoints = (c: Clash) =>
  c.entries.reduce(
    (max, e) => Math.max(max, e.argument.points),
    c.root.argument.points,
  );

export function buildClashes(input: {
  arguments: UserArgumentCardProps[];
  status: "live" | "concluded";
  now: number;
}): Clash[] {
  const { arguments: all, status, now } = input;

  const present = new Set(all.map((a) => a.argument_id));
  const children = new Map<number, UserArgumentCardProps[]>();
  const roots: UserArgumentCardProps[] = [];

  for (const a of all) {
    const parentId = a.replyTo?.argumentId;
    // A parent that is not here — filtered out upstream, or removed before the
    // FK's ON DELETE SET NULL landed — opens its own clash rather than
    // disappearing from the page.
    if (parentId === undefined || !present.has(parentId)) {
      roots.push(a);
      continue;
    }
    const siblings = children.get(parentId);
    if (siblings) siblings.push(a);
    else children.set(parentId, [a]);
  }

  const clashes = roots.map((root) => {
    const entries: ClashEntry[] = [];
    let frontier = [root];
    let depth = 0;
    while (frontier.length > 0) {
      depth += 1;
      const next = frontier
        .flatMap((parent) => children.get(parent.argument_id) ?? [])
        .sort((a, b) => at(a) - at(b));
      for (const argument of next) entries.push({ argument, depth });
      frontier = next;
    }

    return {
      id: root.argument_id,
      root: { argument: root, depth: 0 },
      entries,
      unanswered:
        entries.length === 0 &&
        (status === "concluded" ||
          now - at(root) >= UNANSWERED_AFTER_HOURS * HOUR_MS),
    };
  });

  return clashes.sort((a, b) =>
    status === "live"
      ? newestAt(b) - newestAt(a)
      : bestPoints(b) - bestPoints(a) ||
        b.entries.length - a.entries.length ||
        newestAt(b) - newestAt(a),
  );
}
