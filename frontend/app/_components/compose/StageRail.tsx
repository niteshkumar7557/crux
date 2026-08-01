// Where you are in the compose flow.

import { Stage } from "@/app/motion/new/types";

const STAGES: { id: Stage; numeral: string; label: string }[] = [
  { id: "compose", numeral: "I", label: "Compose" },
  { id: "arbiter", numeral: "II", label: "Arbiter" },
  { id: "broadcast", numeral: "III", label: "Broadcast" },
];

const StageRail = ({ stage }: { stage: Stage }) => {
  const activeIdx = STAGES.findIndex((s) => s.id === stage);

  return (
    <div
      className="flex items-center gap-2 sm:gap-3 mb-8"
      aria-label={`Stage ${activeIdx + 1} of 3`}
    >
      {STAGES.map((s, i) => {
        const reached = i <= activeIdx;
        return (
          <div key={s.id} className="flex items-center gap-2 sm:gap-3 grow last:grow-0">
            {/* The label face is tracked at 0.24em by the system, which is 19px of
                pure letter-spacing across these three words — enough to run
                "III Broadcast" off a 360px card. It tightens below sm rather than
                shrinking, so the rail keeps its weight. */}
            <span
              className={`flex items-center gap-2 font-label text-[0.6rem] sm:text-[0.62rem] uppercase tracking-[0.14em] sm:tracking-[0.24em] whitespace-nowrap transition-colors ${
                reached ? "text-ink" : "text-ink-soft"
              }`}
            >
              <span
                className={`font-headline text-sm not-italic tabular-nums transition-colors ${
                  reached ? "text-ink" : "text-ink-faint"
                }`}
              >
                {s.numeral}
              </span>
              {s.label}
            </span>
            {i < STAGES.length - 1 && (
              <span
                className={`h-px grow transition-colors ${
                  i < activeIdx ? "bg-ink/50" : "bg-ink-faint"
                }`}
              ></span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StageRail;
