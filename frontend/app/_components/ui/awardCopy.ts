// §14 the points pop-up — the copy rules, pure and testable.
//
// "Every mechanic that can change a user's outcome must be visible at the
// moment it matters." For scoring, that moment is the instant an argument is
// accepted, and the disclosure is the arithmetic behind the number.

/** §15: a standalone argument caps here. */
const STANDALONE_CAP = 5;

/** §14: what a posted argument earned — the body of POST /motion/:id/arguments/:side. */
export interface Award {
  points: number;
  judged: number;
  capped: boolean;
  halved: boolean;
  isReply: boolean;
  replyToUsername: string | null;
  seasonLogic: number;
  seasonRank: number;
}

/** One row of the arithmetic: a named step and what it was worth. */
export interface LedgerRow {
  label: string;
  /** Signed for a deduction ("−3"), plain for a score ("8"). */
  value: string;
  /** The final award — ruled off from the steps above it. */
  total?: boolean;
}

/** Deductions read as deductions; a true minus sign, not a hyphen. */
function signed(delta: number): string {
  return delta < 0 ? `−${Math.abs(delta)}` : String(delta);
}

/**
 * The arithmetic under the number, as a ledger.
 *
 * §14 requires the modifiers to be *shown rather than hidden*, and a ledger
 * shows more than the old sentences did: each rule is priced. "Capped at 5"
 * told you where you landed; "Standalone cap −3" tells you what it cost, which
 * is the number that changes behaviour.
 *
 * Two modifiers can bite at once (judged 7 → capped to 5 → halved to 2) and
 * both are priced, in §6's documented order: judge, cap, halve. When nothing
 * bit there is no arithmetic — a single row, and the note carries the why.
 */
export function awardLedger(a: Award): LedgerRow[] {
  const rows: LedgerRow[] = [{ label: "Judged", value: String(a.judged) }];
  if (!a.capped && !a.halved) return rows;

  let running = a.judged;
  if (a.capped) {
    rows.push({
      label: "Standalone cap",
      value: signed(STANDALONE_CAP - running),
    });
    running = STANDALONE_CAP;
  }
  if (a.halved) {
    // §6 halves the 4th argument "and later", with a floor of 1 — so at a
    // running score of 1 the halving is real but costs nothing, and the row
    // says so rather than vanishing and leaving the total unexplained.
    rows.push({ label: "Repeat halving", value: signed(a.points - running) });
  }
  rows.push({ label: "Awarded", value: String(a.points), total: true });
  return rows;
}

/**
 * The one sentence under the ledger, in the arena's own voice.
 *
 * §14: "A user who has seen the cap once will use the reply button next time —
 * and that is the behaviour the whole game is designed to produce." So the cap
 * teaches, and an unreduced rebuttal says why it kept the full range. The two
 * can never both apply: the cap only bites a standalone.
 */
export function awardNote(a: Award): string | null {
  if (a.capped) return "Reply to an opponent next time to earn up to 8.";
  if (!a.halved && a.isReply && a.replyToUsername) {
    return `A targeted rebuttal of @${a.replyToUsername} — the full range was in play.`;
  }
  return null;
}
