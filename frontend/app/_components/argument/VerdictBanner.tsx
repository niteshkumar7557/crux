import { MatchState } from "@/app/argument/types";
import ShareVerdict from "@/app/_components/argument/ShareVerdict";

type Winner = MatchState["winner"];

// Literal class strings per ruling so Tailwind's scanner keeps them
// (mirrors the CaseColumn per-side pattern). Red only ever means "against".
const RULINGS: Record<
  "for" | "against" | "draw" | "walkover",
  { label: string; labelClass: string; panelClass: string }
> = {
  for: {
    label: "Affirmative Wins",
    labelClass: "text-primary",
    panelClass: "border-primary shadow-glow-primary",
  },
  against: {
    label: "Negative Wins",
    labelClass: "text-secondary",
    panelClass: "border-secondary shadow-glow-secondary",
  },
  draw: {
    label: "Draw",
    labelClass: "text-tertiary",
    panelClass: "border-tertiary",
  },
  walkover: {
    label: "Unopposed",
    labelClass: "text-outline",
    panelClass: "border-outline",
  },
};

/**
 * §14 the payout breakdown. Two rows of the transparency table land here: the
 * season-only loss penalty must be stated "before AND after" (the side-lock
 * confirmation is the before), and "MVP comes from the winning side" has to be
 * on the verdict card as well as the rules page — otherwise a draw with no MVP
 * just looks like the judge forgot.
 */
function payoutBreakdown(winner: Winner): string {
  if (winner === "walkover") {
    return "One side never argued, so this concluded unopposed: nobody scored anything — no logic, no record, not even the author's bonus.";
  }
  if (winner === "draw") {
    return "A draw pays nothing to either side, and names no MVP — there is no winning side to take one from. The statement's author still earns +5 logic.";
  }
  return "Winning side +10 logic, and +25 instead for the MVP — always chosen from the winning side. The author earns +5. The losing side loses 5 points from their season score only; all-time logic never falls.";
}

const VerdictBanner = ({
  winner,
  margin,
  mvpUsername,
  verdictText,
  affirmative,
  negative,
  shareUrl,
  certificateHref,
}: {
  winner: Winner;
  margin: number | null;
  mvpUsername: string | null;
  verdictText: string | null;
  affirmative: number;
  negative: number;
  shareUrl: string;
  certificateHref: string;
}) => {
  const ruling = RULINGS[winner ?? "draw"];
  const showMargin = winner !== "walkover" && margin !== null;

  return (
    <div
      className={`mb-8 bg-surface-container-low border-l-4 p-6 md:p-8 ${ruling.panelClass}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-4">
        <span
          className={`font-label text-lg md:text-2xl font-bold uppercase tracking-[0.15em] ${ruling.labelClass}`}
        >
          {ruling.label}
        </span>
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
          Verdict
        </span>
        <span className="ml-auto self-center">
          <ShareVerdict
            url={shareUrl}
            title={ruling.label}
            certificateHref={certificateHref}
          />
        </span>
      </div>

      {showMargin && (
        <div className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-2">
          {affirmative} – {negative} · margin {margin}
        </div>
      )}

      {mvpUsername && (
        <div className="font-label text-xs uppercase tracking-[0.2em] text-tertiary mb-4">
          MVP — @{mvpUsername}
        </div>
      )}

      {verdictText && (
        <p className="font-headline italic text-xl md:text-2xl text-on-surface leading-relaxed max-w-3xl">
          {verdictText}
        </p>
      )}

      <p className="mt-6 pt-4 border-t border-outline-variant/20 font-body text-[11px] text-outline leading-relaxed max-w-3xl">
        {payoutBreakdown(winner)}
      </p>
    </div>
  );
};

export default VerdictBanner;
