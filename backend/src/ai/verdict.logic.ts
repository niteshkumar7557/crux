export type Side = "for" | "against";

export interface RawVerdict {
  for: number;
  against: number;
  winner: string;
  mvp_username: string | null;
  closing: string;
}

export interface Participant {
  userId: number;
  side: Side;
}

export type ParticipantWithName = Participant & { username: string };

export interface ResolvedVerdict {
  affirmative: number;
  negative: number;
  winner: Side | "draw";
  margin: number;
  mvpUserId: number | null;
}

// §15 — the verdict constants.
/** §7: the margin must EXCEED this for a side to win. At or below it, a draw. */
export const DRAW_MARGIN = 5;
/** §8: replaces the win bonus for the MVP, never stacks with it. */
export const MVP_BONUS = 25;
export const WIN_BONUS = 10;
/** §8: negative, and applied season-only so a career total never falls. */
export const LOSS_PENALTY = -5;
export const AUTHOR_BONUS = 5;

/**
 * §7 — turn the judge's raw ruling into the settled result.
 *
 * The model's percentages are treated as a ratio, not gospel: they are
 * normalised to sum to 100 so a sloppy response can't produce a nonsense
 * margin. The MVP is validated hard — it must be a real participant AND on
 * the winning side, because "the MVP comes from the winning side" is a rule
 * we state to users, not a suggestion we make to the model.
 */
export function resolveVerdict(
  raw: RawVerdict,
  participants: ParticipantWithName[],
): ResolvedVerdict {
  const forRaw = Number.isFinite(raw.for) ? Math.max(0, raw.for) : 0;
  const againstRaw = Number.isFinite(raw.against) ? Math.max(0, raw.against) : 0;
  const total = forRaw + againstRaw;

  const affirmative = total <= 0 ? 50 : Math.round((forRaw / total) * 100);
  const negative = 100 - affirmative;
  const margin = Math.abs(affirmative - negative);

  const winner: Side | "draw" =
    margin <= DRAW_MARGIN ? "draw" : affirmative > negative ? "for" : "against";

  let mvpUserId: number | null = null;
  if (winner !== "draw" && raw.mvp_username) {
    const p = participants.find((x) => x.username === raw.mvp_username);
    if (p && p.side === winner) mvpUserId = p.userId;
  }

  return { affirmative, negative, winner, margin, mvpUserId };
}

export type Outcome = "win" | "loss" | "draw";

export interface DebateResultRow {
  userId: number;
  side: Side;
  outcome: Outcome;
  isMvp: boolean;
}

export interface LogicAward {
  userId: number;
  amount: number;
  /** True for the loss penalty: ledger it, but never touch logic_score. */
  seasonOnly: boolean;
}

export interface Payouts {
  results: DebateResultRow[];
  logicAwards: LogicAward[];
}

/**
 * §8 — who gets what. The author bonus is a separate award from any
 * participation bonus, so an author who also argued receives both.
 */
export function resolvePayouts(input: {
  winner: Side | "draw";
  participants: Participant[];
  mvpUserId: number | null;
  authorId: number;
}): Payouts {
  const { winner, participants, mvpUserId, authorId } = input;

  const results: DebateResultRow[] = participants.map((p) => ({
    userId: p.userId,
    side: p.side,
    outcome: winner === "draw" ? "draw" : p.side === winner ? "win" : "loss",
    isMvp: p.userId === mvpUserId,
  }));

  const logicAwards: LogicAward[] = [];
  for (const r of results) {
    if (r.outcome === "win") {
      logicAwards.push({
        userId: r.userId,
        amount: r.isMvp ? MVP_BONUS : WIN_BONUS,
        seasonOnly: false,
      });
    } else if (r.outcome === "loss") {
      logicAwards.push({
        userId: r.userId,
        amount: LOSS_PENALTY,
        seasonOnly: true,
      });
    }
    // A draw pays nothing either way.
  }

  logicAwards.push({ userId: authorId, amount: AUTHOR_BONUS, seasonOnly: false });

  return { results, logicAwards };
}

/**
 * §7 — a side was empty at lock. Nobody scores, the author included: you
 * cannot win a contest nobody entered, and paying the author here would
 * reward posting statements nobody wants to argue.
 */
export function walkoverPayout(): Payouts {
  return { results: [], logicAwards: [] };
}
