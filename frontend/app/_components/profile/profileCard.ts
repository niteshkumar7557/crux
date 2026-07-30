// What a profile's share card says, decided away from the drawing.
//
// satori cannot reflow or ellipsize, so anything unbounded has to be cut here or
// it silently overruns the frame. Spec: game-theory.md §13, §14

// Relative, not "@/" — the alias is only safe for type-only imports here, since
// those are erased before the test runner ever has to resolve them.
import { truncate } from "../motion/verdictCard";
import type { ProfileShell } from "@/app/profile/types";

const NAME_MAX = 26;
const TITLE_MAX = 34;

export interface ProfileCardModel {
  name: string;
  handle: string;
  tier: string;
  logic: number;
  record: string;
  rank: string | null;
  title: string | null;
  mvp: string | null;
}

/**
 * The best season title on the shelf: rank 1 beats rank 3, and a later season
 * breaks a tie — the most recent win is the one worth showing.
 */
function bestTitle(titles: ProfileShell["titles"]): string | null {
  if (!Array.isArray(titles) || titles.length === 0) return null;
  const best = [...titles].sort(
    (a, b) => a.rank - b.rank || b.seasonNumber - a.seasonNumber,
  )[0];
  return best?.title ? truncate(best.title, TITLE_MAX) : null;
}

export function buildProfileCard(shell: ProfileShell): ProfileCardModel {
  const { identity, standing } = shell;
  const { wins, losses, draws } = standing.record;

  return {
    name: truncate(identity.name || identity.username, NAME_MAX),
    handle: `@${identity.username}`,
    tier: String(standing.tier || "").toUpperCase(),
    logic: Math.max(0, Math.floor(Number(standing.logic) || 0)),
    // En dashes, the same as the profile's own record strip.
    record: `${wins}–${losses}–${draws}`,
    rank: standing.globalRank > 0 ? `#${standing.globalRank}` : null,
    title: bestTitle(shell.titles),
    mvp: standing.mvpCount > 0 ? `${standing.mvpCount}× MVP` : null,
  };
}
