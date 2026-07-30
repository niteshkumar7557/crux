// The points pop-up's ledger and its note. Pure. Every modifier that bit is PRICED —
// "capped at 7" says where you landed, "Standalone cap -2" says what it cost, and
// that is the number that changes behaviour.
//
// This is a deliberate second copy of the backend's STANDALONE_CAP: the frontend
// cannot import backend modules. Change one and you must change the other —
// codebase-guide.md's drift table lists both homes.
// Spec: game-theory.md §7, §19

const STANDALONE_CAP = 7;

export interface Award {
  points: number;
  judged: number;
  capped: boolean;
  isReply: boolean;
  replyToUsername: string | null;
  seasonLogic: number;
  seasonRank: number;
}

export interface LedgerRow {
  label: string;
  value: string;
  total?: boolean;
}

function signed(delta: number): string {
  return delta < 0 ? `−${Math.abs(delta)}` : String(delta);
}

export function awardLedger(a: Award): LedgerRow[] {
  const rows: LedgerRow[] = [{ label: "Judged", value: String(a.judged) }];
  if (!a.capped) return rows;

  rows.push({
    label: "Standalone cap",
    value: signed(STANDALONE_CAP - a.judged),
  });
  rows.push({ label: "Awarded", value: String(a.points), total: true });
  return rows;
}

export function awardNote(a: Award): string | null {
  if (a.capped) return "Reply to an opponent next time to earn up to 10.";
  if (a.isReply && a.replyToUsername) {
    return `A targeted rebuttal of @${a.replyToUsername} — the full range was in play.`;
  }
  return null;
}
