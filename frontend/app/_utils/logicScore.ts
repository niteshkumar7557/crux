// Maps a raw logic score to the reputation tier and letter grade used
// across the arena (comment cards, leaderboard standings).
// Beginner      -> B   0-50
// Intermediate  -> B+  50-100
// Skilled       -> A   100-150
// Expert        -> A+  150-200
// Master        -> M   200+
export function convertLogicScore(score: number) {
  const logicIndex =
    Number(score >= 50) +
    Number(score >= 100) +
    Number(score >= 150) +
    Number(score >= 200);

  return {
    reputation: ["beginner", "intermediate", "skilled", "expert", "master"][
      logicIndex
    ],
    grade: ["B", "B+", "A", "A+", "M"][logicIndex],
  };
}
