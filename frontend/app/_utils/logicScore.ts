// The tier ladder, as data. Duplicates the ladder in
// backend/src/controllers/profile.controller.ts — change both, or the profile and
// the cards disagree. Spec: game-theory.md §13

export const TIER_LADDER = [
  { at: 0, tier: "beginner" },
  { at: 100, tier: "intermediate" },
  { at: 200, tier: "skilled" },
  { at: 300, tier: "expert" },
  { at: 400, tier: "master" },
] as const;

export interface TierProgress {
  tier: string;
  index: number;
  floor: number;
  nextAt: number | null;
  nextTier: string | null;
  toNext: number;
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
    index,
    floor: current.at,
    nextAt: next.at,
    nextTier: next.tier,
    toNext: next.at - s,
    pct: (s - current.at) / (next.at - current.at),
  };
}

export function convertLogicScore(score: number) {
  const p = tierProgress(score);
  return { reputation: p.tier };
}
