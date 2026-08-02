// One-off, idempotent backfill for the columns the migration runner cannot
// populate itself (Postgres has no equivalent of the \p{L}\p{M} Unicode
// regex `normaliseArgument` depends on). Safe to run repeatedly — it only
// ever touches rows still missing a value. Wired into `npm run db-init` /
// `npm run development` so a fresh checkout (including CI) ends up fully
// backfilled without a manual step.
// Spec: game-theory.md §3, §8

import pool from "../src/db/index.js";
import { contentHash, normaliseArgument } from "../src/lib/duplicate.logic.js";
import { fingerprintOf } from "../src/lib/similarity.logic.js";

async function backfillArgumentHashesAndFingerprints(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, content FROM arguments WHERE content_hash IS NULL OR fingerprint IS NULL`,
  );
  console.log(`arguments: backfilling ${rows.length} row(s)`);
  for (const row of rows) {
    await pool.query(`UPDATE arguments SET content_hash = $1, fingerprint = $2 WHERE id = $3`, [
      contentHash(row.content),
      fingerprintOf(row.content),
      row.id,
    ]);
  }
}

async function backfillMotionNormalisedContent(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, content FROM motions WHERE normalised_content IS NULL`,
  );
  console.log(`motions: backfilling ${rows.length} row(s)`);
  for (const row of rows) {
    await pool.query(`UPDATE motions SET normalised_content = $1 WHERE id = $2`, [
      normaliseArgument(row.content),
      row.id,
    ]);
  }

  const { rows: collisions } = await pool.query(
    `SELECT normalised_content, array_agg(id ORDER BY id) AS ids
     FROM motions
     GROUP BY normalised_content
     HAVING COUNT(*) > 1`,
  );
  if (collisions.length > 0) {
    console.error(
      `❌ ${collisions.length} normalised-content collision(s) found. These motions ` +
        `normalise identically and need a human decision (merge, rename, or accept) ` +
        `BEFORE the unique index can be created. Nothing was auto-deleted.`,
    );
    for (const c of collisions) {
      console.error(`  normalised: "${c.normalised_content}" — motion ids: ${c.ids.join(", ")}`);
    }
    throw new Error("motion normalised_content collisions must be resolved manually — see above");
  }

  await pool.query(`ALTER TABLE motions ALTER COLUMN normalised_content SET NOT NULL`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_motions_normalised_content ON motions(normalised_content)`,
  );
}

async function main() {
  await backfillArgumentHashesAndFingerprints();
  await backfillMotionNormalisedContent();
  await pool.end();
  console.log("✅ backfill complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
