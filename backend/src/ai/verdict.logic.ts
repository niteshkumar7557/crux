// The closing ruling and every payout. Pure.
//
// The judge's numbers are a ratio, not gospel: they are renormalised to 100, the
// winner is recomputed from the margin, and the MVP must match a real participant
// on the winning side. Rules we state to users are enforced here, not requested of
// the model.
// Spec: game-theory.md §11, §12

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

export const DRAW_MARGIN = 5;
export const MVP_BONUS = 25;
export const WIN_BONUS = 10;
export const LOSS_PENALTY = -5;
export const AUTHOR_BONUS = 10;

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
  seasonOnly: boolean;
}

export interface Payouts {
  results: DebateResultRow[];
  logicAwards: LogicAward[];
}

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
  }

  logicAwards.push({ userId: authorId, amount: AUTHOR_BONUS, seasonOnly: false });

  return { results, logicAwards };
}

export function walkoverPayout(): Payouts {
  return { results: [], logicAwards: [] };
}
