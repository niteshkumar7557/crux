import { MatchState } from "@/app/argument/types";

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

const VerdictBanner = ({
  winner,
  margin,
  mvpUsername,
  verdictText,
  affirmative,
  negative,
}: {
  winner: Winner;
  margin: number | null;
  mvpUsername: string | null;
  verdictText: string | null;
  affirmative: number;
  negative: number;
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
    </div>
  );
};

export default VerdictBanner;
