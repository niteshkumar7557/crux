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

// §8.3: the sharpest debater on the LOSING side of a decisive match, never the
// MVP. Null on a draw/walkover, an unknown name, or a winning-side name.
export function resolveStandout(
  rawStandout: string | null,
  winner: Side | "draw",
  participants: { userId: number; side: Side; username: string }[],
  mvpUserId: number | null,
): number | null {
  if (!rawStandout || winner === "draw") return null;
  const p = participants.find((x) => x.username === rawStandout);
  if (!p) return null;
  if (p.side === winner) return null; // must be on the losing side
  if (p.userId === mvpUserId) return null; // never double with the MVP
  return p.userId;
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
  isStandout: boolean;
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
export const STANDOUT_BONUS = 5;
export const AUTHOR_BASE_BONUS = 4;
export const AUTHOR_BONUS_CAP = 8;
export const AUTHOR_WALKOVER_BONUS = 2;

export function resolvePayouts(input: {
  winner: Side | "draw";
  participants: Participant[];
  mvpUserId: number | null;
  standoutUserId?: number | null;
  authorId: number;
}): Payouts {
  const { winner, participants, mvpUserId, authorId } = input;
  const standoutUserId = input.standoutUserId ?? null;

  const results: DebateResultRow[] = participants.map((p) => {
    const outcome: Outcome =
      winner === "draw" ? "draw" : p.side === winner ? "win" : "loss";
    return {
      userId: p.userId,
      side: p.side,
      outcome,
      isMvp: p.userId === mvpUserId,
      isStandout: p.userId === standoutUserId,
    };
  });

  const logicAwards: LogicAward[] = [];
  if (mvpUserId !== null) logicAwards.push({ userId: mvpUserId, amount: MVP_BONUS });
  if (standoutUserId !== null)
    logicAwards.push({ userId: standoutUserId, amount: STANDOUT_BONUS });
  logicAwards.push({
    userId: authorId,
    amount: AUTHOR_BASE_BONUS + Math.min(participants.length, AUTHOR_BONUS_CAP),
  });

  return { results, logicAwards };
}

export function walkoverPayout(authorId: number): Payouts {
  return { results: [], logicAwards: [{ userId: authorId, amount: AUTHOR_WALKOVER_BONUS }] };
}
