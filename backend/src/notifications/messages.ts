// §14 pure notification copy — testable, no I/O.

/** The "verdict's in" message, flavoured by the recipient's outcome. */
export function verdictMessage(outcome: string, isMvp: boolean): string {
  if (outcome === "win") {
    return isMvp
      ? "You won and were named MVP! The verdict is in."
      : "You won the debate. The verdict is in.";
  }
  if (outcome === "loss") return "The verdict is in — you lost this one.";
  return "The verdict is in — the debate ended in a draw.";
}

/** Someone replied directly to one of your comments (§14, the strongest pull). */
export function replyMessage(actor: string): string {
  return `@${actor} replied directly to your argument.`;
}

/** A new challenger joined the opposing side of a debate you're in. */
export function oppositionMessage(actor: string): string {
  return `@${actor} joined the opposing side of your debate.`;
}

/**
 * §10: a season closed and you placed. The title is the only reward that
 * survives a season, so the copy says "permanently" out loud.
 */
export function seasonAwardMessage(title: string, rank: number): string {
  return `You finished #${rank} last season — "${title}" is yours, permanently.`;
}
