// The ONE place logic changes hands. Updates the all-time score and writes the
// ledger row together, so the career total and the seasonal window can never
// drift. `db` is the pool or a transaction client.
//
// seasonOnly = true writes the ledger row WITHOUT touching logic_score. That is
// the §8 loss penalty: it costs you the month's race, never your career.
interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}

export async function awardLogic(
  db: Queryable,
  userId: number,
  amount: number,
  reason: string,
  seasonOnly = false,
): Promise<void> {
  if (!seasonOnly) {
    // Floor at 0 -- the abuse penalty must never show a negative career score.
    await db.query(
      `UPDATE users SET logic_score = GREATEST(logic_score + $2, 0) WHERE id = $1`,
      [userId, amount],
    );
  }
  await db.query(
    `INSERT INTO logic_events (user_id, amount, reason, season_only)
     VALUES ($1, $2, $3, $4)`,
    [userId, amount, reason, seasonOnly],
  );
}
