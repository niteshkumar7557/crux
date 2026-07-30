// The points pop-up's ledger and its note. Pure. Every modifier that bit is PRICED —
// "capped at 5" says where you landed, "Standalone cap -3" says what it cost, and
// that is the number that changes behaviour.
// Spec: game-theory.md §7, §19

const STANDALONE_CAP = 5;

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
    rows.push({ label: "Repeat halving", value: signed(a.points - running) });
  }
  rows.push({ label: "Awarded", value: String(a.points), total: true });
  return rows;
}

export function awardNote(a: Award): string | null {
  if (a.capped) return "Reply to an opponent next time to earn up to 8.";
  if (!a.halved && a.isReply && a.replyToUsername) {
    return `A targeted rebuttal of @${a.replyToUsername} — the full range was in play.`;
  }
  return null;
}
