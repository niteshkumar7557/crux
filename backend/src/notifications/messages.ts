// §10 pure notification copy — testable, no I/O.

/** The "verdict's in" message, flavoured by the recipient's outcome. */
export function verdictMessage(
  outcome: string,
  isMvp: boolean,
  isUpset: boolean,
): string {
  if (outcome === "win") {
    if (isUpset) return "Upset win — you took it from behind! The verdict is in.";
    if (isMvp) return "You won and were named MVP! The verdict is in.";
    return "You won the debate. The verdict is in.";
  }
  if (outcome === "loss") return "The verdict is in — you lost this one.";
  return "The verdict is in — the debate ended in a draw.";
}

/** A new challenger joined the opposing side of a debate you're in. */
export function oppositionMessage(actor: string): string {
  return `@${actor} joined the opposing side of your debate.`;
}
