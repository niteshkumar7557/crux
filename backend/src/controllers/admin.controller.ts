import type { Request, Response } from "express";
import pool from "../db/index.js";

// §11 The pin — an admin curates the stage by hand. At launch, when there is
// barely enough volume for heat to mean anything, this is how the stage gets
// its taste; as real volume arrives, heat takes over and pinning becomes the
// exception.
//
// Both endpoints are live-only: the stage exists to send readers somewhere they
// can still argue, so a concluded debate must never be pinned onto it.
// Authorisation is the router's job (authMiddleware + requireRole("admin")).

function parseId(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** POST /admin/pin/:id — flips `pinned`. The featuring poller does the rest. */
export async function togglePin(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "invalid argument id" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE arguments SET pinned = NOT pinned
       WHERE id = $1 AND status = 'live'
       RETURNING pinned`,
      [id],
    );

    if (rows.length === 0) {
      // Nothing updated: either it does not exist or it is already concluded.
      // Those are different mistakes, so they get different answers.
      const { rows: found } = await pool.query(
        `SELECT status FROM arguments WHERE id = $1`,
        [id],
      );
      if (found.length === 0) {
        return res.status(404).json({ error: "debate not found" });
      }
      return res.status(409).json({ error: "debate is not live" });
    }

    res.status(200).json({ pinned: rows[0].pinned });
  } catch (err) {
    console.error("❌ togglePin failed:", err);
    res.status(500).json({ error: "Internal DB Error!" });
  }
}

/**
 * POST /admin/dotd/:id — hand-crown the Debate of the Day.
 *
 * Feature the new hero in the same transaction that crowns it. The home hero
 * query asks for `featured = TRUE AND is_dotd = TRUE`, so clearing the old
 * crown without featuring the new one would blank the home page until the next
 * featuring tick — up to five minutes of empty hero for an admin action.
 *
 * The poller then leaves this alone: its guard is "has a live debate been
 * crowned inside the current UTC day", and `dotd_at = NOW()` satisfies it. The
 * admin's pick holds until tomorrow.
 */
export async function setDotd(req: Request, res: Response) {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "invalid argument id" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check first, clear second. Clearing before we know the target is
    // eligible would drop the reigning DotD and crown nothing in its place.
    const { rows } = await client.query(
      `SELECT status FROM arguments WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "debate not found" });
    }
    if (rows[0].status !== "live") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "debate is not live" });
    }

    await client.query(
      `UPDATE arguments SET is_dotd = FALSE WHERE is_dotd = TRUE AND id <> $1`,
      [id],
    );
    await client.query(
      `UPDATE arguments
       SET is_dotd = TRUE,
           dotd_at = NOW(),
           featured = TRUE,
           featured_at = COALESCE(featured_at, NOW())
       WHERE id = $1`,
      [id],
    );

    await client.query("COMMIT");
    res.status(200).json({ isDotd: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ setDotd failed:", err);
    res.status(500).json({ error: "Internal DB Error!" });
  } finally {
    client.release();
  }
}
