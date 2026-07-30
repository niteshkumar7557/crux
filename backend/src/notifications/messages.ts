// Notification copy, pure and testable.
// Spec: game-theory.md §20

export function verdictMessage(outcome: string, isMvp: boolean): string {
  if (outcome === "win") {
    return isMvp
      ? "You won and were named MVP! The verdict is in."
      : "You won the debate. The verdict is in.";
  }
  if (outcome === "loss") return "The verdict is in — you lost this one.";
  return "The verdict is in — the debate ended in a draw.";
}

export function replyMessage(actor: string): string {
  return `@${actor} replied directly to your argument.`;
}

export function oppositionMessage(actor: string): string {
  return `@${actor} joined the opposing side of your debate.`;
}

export function seasonAwardMessage(title: string, rank: number): string {
  return `You finished #${rank} last season — "${title}" is yours, permanently.`;
}
