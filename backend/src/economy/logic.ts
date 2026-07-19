// §12: award logic AND ledger it in one place, so the all-time logic_score and
// the seasonal logic_events window can never drift apart. `db` is the pool or a
// transaction client (verdict payouts run inside the conclusion transaction).
interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}

export async function awardLogic(
  db: Queryable,
  userId: number,
  amount: number,
  reason: string,
): Promise<void> {
  await db.query(`UPDATE users SET logic_score = logic_score + $2 WHERE id = $1`, [
    userId,
    amount,
  ]);
  await db.query(
    `INSERT INTO logic_events (user_id, amount, reason) VALUES ($1, $2, $3)`,
    [userId, amount, reason],
  );
}
