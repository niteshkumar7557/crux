export type Side = "for" | "against";

export interface RawVerdict {
  for: number;
  against: number;
  winner: string;
  mvp_username: string | null;
  standout_username: string | null;
  closing: string;
}

export interface ResolvedVerdict {
  affirmative: number;
  negative: number;
  winner: Side | "draw";
  margin: number;
  mvpUsername: string | null;
}

export const DRAW_THRESHOLD = 6;

export function resolveVerdict(
  raw: RawVerdict,
  participantUsernames: Set<string>,
): ResolvedVerdict {
  const forRaw = Number.isFinite(raw.for) ? Math.max(0, raw.for) : 0;
  const againstRaw = Number.isFinite(raw.against) ? Math.max(0, raw.against) : 0;
  const total = forRaw + againstRaw;

  const affirmative = total <= 0 ? 50 : Math.round((forRaw / total) * 100);
  const negative = 100 - affirmative;
  const margin = Math.abs(affirmative - negative);

  let winner: Side | "draw";
  if (margin <= DRAW_THRESHOLD) winner = "draw";
  else winner = affirmative > negative ? "for" : "against";

  const mvpUsername =
    raw.mvp_username && participantUsernames.has(raw.mvp_username)
      ? raw.mvp_username
      : null;

  return { affirmative, negative, winner, margin, mvpUsername };
}

export type Outcome = "win" | "loss" | "draw";

export interface Participant {
  userId: number;
  side: Side;
}

export interface DebateResultRow {
  userId: number;
  side: Side;
  outcome: Outcome;
  isMvp: boolean;
}

export interface LogicAward {
  userId: number;
  amount: number;
}

export interface Payouts {
  results: DebateResultRow[];
  logicAwards: LogicAward[];
}

export const MVP_BONUS = 10;
export const AUTHOR_BASE_BONUS = 4;
export const AUTHOR_BONUS_CAP = 8;
export const AUTHOR_WALKOVER_BONUS = 2;

export function resolvePayouts(input: {
  winner: Side | "draw";
  participants: Participant[];
  mvpUserId: number | null;
  authorId: number;
}): Payouts {
  const { winner, participants, mvpUserId, authorId } = input;

  const results: DebateResultRow[] = participants.map((p) => {
    const outcome: Outcome =
      winner === "draw" ? "draw" : p.side === winner ? "win" : "loss";
    return {
      userId: p.userId,
      side: p.side,
      outcome,
      isMvp: p.userId === mvpUserId,
    };
  });

  const logicAwards: LogicAward[] = [];
  if (mvpUserId !== null) logicAwards.push({ userId: mvpUserId, amount: MVP_BONUS });
  logicAwards.push({
    userId: authorId,
    amount: AUTHOR_BASE_BONUS + Math.min(participants.length, AUTHOR_BONUS_CAP),
  });

  return { results, logicAwards };
}

export function walkoverPayout(authorId: number): Payouts {
  return { results: [], logicAwards: [{ userId: authorId, amount: AUTHOR_WALKOVER_BONUS }] };
}
