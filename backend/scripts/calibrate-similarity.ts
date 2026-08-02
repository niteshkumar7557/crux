// One-off report: scores every own-side argument pair on live/seeded motions
// and prints the distribution, so SIMILAR_THRESHOLD is picked from real data
// rather than intuition. Run before trusting the shipped 0.75.
// Spec: game-theory.md §8
import pool from "../src/db/index.js";
import {
  fingerprintOf,
  diceFromFingerprints,
  SIMILARITY_MIN_LENGTH,
} from "../src/lib/similarity.logic.js";
import { normaliseArgument } from "../src/lib/duplicate.logic.js";

async function main() {
  const { rows } = await pool.query(
    `SELECT motion_id, side, id, content FROM arguments ORDER BY motion_id, side, created_at`,
  );
  const bySide = new Map<string, { id: number; content: string }[]>();
  for (const r of rows) {
    const key = `${r.motion_id}:${r.side}`;
    if (!bySide.has(key)) bySide.set(key, []);
    bySide.get(key)!.push({ id: r.id, content: r.content });
  }

  const scores: number[] = [];
  for (const group of bySide.values()) {
    for (let i = 0; i < group.length; i++) {
      if (normaliseArgument(group[i].content).length < SIMILARITY_MIN_LENGTH) continue;
      const fp = fingerprintOf(group[i].content);
      for (let j = i + 1; j < group.length; j++) {
        if (normaliseArgument(group[j].content).length < SIMILARITY_MIN_LENGTH) continue;
        scores.push(diceFromFingerprints(fp, fingerprintOf(group[j].content)));
      }
    }
  }

  scores.sort((a, b) => a - b);
  console.log(`pairs scored: ${scores.length}`);
  for (const p of [0.5, 0.75, 0.9, 0.95, 0.99]) {
    const idx = Math.min(scores.length - 1, Math.floor(p * scores.length));
    console.log(`p${Math.round(p * 100)}: ${scores[idx]?.toFixed(3) ?? "n/a"}`);
  }
  const buckets = [0, 0.2, 0.4, 0.45, 0.6, 0.75, 0.8, 0.9, 1.01];
  for (let b = 0; b < buckets.length - 1; b++) {
    const n = scores.filter((s) => s >= buckets[b] && s < buckets[b + 1]).length;
    console.log(`[${buckets[b]}, ${buckets[b + 1]}): ${n}`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
