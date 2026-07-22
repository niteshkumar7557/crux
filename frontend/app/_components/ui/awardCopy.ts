// §14 the points pop-up — the copy rules, pure and testable.
//
// "Every mechanic that can change a user's outcome must be visible at the
// moment it matters." For scoring, that moment is the instant a comment is
// accepted, and the disclosure is the arithmetic behind the number.

/** §15: a standalone comment caps here. */
const STANDALONE_CAP = 5;

/** §14: what a posted comment earned — the body of POST /comment/:side/:id. */
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

/**
 * The explanation under the number, as separate lines.
 *
 * §14 renders a modifier as a stacked ledger — "Judged 6" above "Capped at 5
 * (standalone)" — because the point is to *show the arithmetic rather than
 * hide it*. Two modifiers can bite at once (judged 7 → capped to 5 → halved to
 * 2), and both are named, in §6's documented order: judge, cap, halve. Showing
 * only the last one would hide exactly the step the user needs to see.
 *
 * When nothing bit, there is no arithmetic to show — so the line explains why
 * the full range was available instead.
 */
export function awardLines(a: Award): string[] {
  if (a.capped || a.halved) {
    const lines = [`Judged ${a.judged}`];
    if (a.capped) lines.push(`Capped at ${STANDALONE_CAP} (standalone)`);
    // §6 halves the 4th comment "and later", so the copy has to hold on the
    // 6th too -- §14's mockup says "4th" because its example is a 4th comment.
    if (a.halved) lines.push("Halved — 4th or later comment in this debate");
    return lines;
  }

  if (a.isReply && a.replyToUsername) {
    return [`Targeted rebuttal of @${a.replyToUsername} — full range unlocked`];
  }

  return [`Judged ${a.judged} — full value`];
}

/**
 * §14: "A user who has seen 'capped at 5 (standalone)' once will use the reply
 * button next time — and that is the behaviour the whole game is designed to
 * produce." Only teach it at the moment it was just paid for.
 */
export function teachingLine(a: Award): string | null {
  return a.capped ? "Reply to an opponent next time to earn up to 8." : null;
}
