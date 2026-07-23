// The §9 tier ladder, as data — one source for the badge, the letter grade
// and the profile's progress bar.
//
// Duplicated in backend/src/controllers/profile.controller.ts
// (convertLogicScore) — the frontend cannot import backend modules. See
// docs/CODEBASE_GUIDE.md §6a; change one and you must change the other.

export const TIER_LADDER = [
  { at: 0, tier: "beginner", grade: "B" },
  { at: 50, tier: "intermediate", grade: "B+" },
  { at: 100, tier: "skilled", grade: "A" },
  { at: 150, tier: "expert", grade: "A+" },
  { at: 200, tier: "master", grade: "M" },
] as const;

export interface TierProgress {
  tier: string;
  grade: string;
  /** 0–4, the index into TIER_LADDER. */
  index: number;
  /** The score at which the current tier begins. */
  floor: number;
  /** The score at which the next tier begins — null at Master. */
  nextAt: number | null;
  nextTier: string | null;
  /** Logic still needed to reach the next tier — 0 at Master. */
  toNext: number;
  /** Progress through the current band, 0–1. Master has no ceiling, so 1. */
  pct: number;
}

export function tierProgress(score: number): TierProgress {
  const s = Math.max(0, Math.floor(Number(score) || 0));

  let index = 0;
  for (let i = 0; i < TIER_LADDER.length; i++) {
    if (s >= TIER_LADDER[i].at) index = i;
  }

  const current = TIER_LADDER[index];
  const next = TIER_LADDER[index + 1];

  if (!next) {
    return {
      tier: current.tier,
      grade: current.grade,
      index,
      floor: current.at,
      nextAt: null,
      nextTier: null,
      toNext: 0,
      pct: 1,
    };
  }

  return {
    tier: current.tier,
    grade: current.grade,
    index,
    floor: current.at,
    nextAt: next.at,
    nextTier: next.tier,
    toNext: next.at - s,
    pct: (s - current.at) / (next.at - current.at),
  };
}

/**
 * Maps a raw logic score to the reputation tier and letter grade used across
 * the arena (comment cards, leaderboard standings).
 */
export function convertLogicScore(score: number) {
  const p = tierProgress(score);
  return { reputation: p.tier, grade: p.grade };
}
