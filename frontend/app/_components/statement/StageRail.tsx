import { Stage } from "@/app/statement/types";

const STAGES: { id: Stage; label: string }[] = [
  { id: "compose", label: "01 Compose" },
  { id: "verdict", label: "02 Verdict" },
  { id: "broadcast", label: "03 Broadcast" },
];

// Slim progress rail across the top of the form card. Purely derived from
// `stage`; colors transition via CSS so reduced-motion needs no special case.
const StageRail = ({ stage }: { stage: Stage }) => {
  const activeIdx = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="flex items-center gap-3 mb-8" aria-label={`Stage ${activeIdx + 1} of 3`}>
      {STAGES.map((s, i) => {
        const reached = i <= activeIdx;
        return (
          <div key={s.id} className="flex items-center gap-3 grow last:grow-0">
            <span
              className={`flex items-center gap-2 font-label text-[10px] uppercase tracking-widest whitespace-nowrap transition-colors ${
                reached ? "text-primary" : "text-outline"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  reached ? "bg-primary" : "bg-outline-variant"
                }`}
              ></span>
              {s.label}
            </span>
            {i < STAGES.length - 1 && (
              <span
                className={`h-px grow transition-colors ${
                  i < activeIdx ? "bg-primary/50" : "bg-outline-variant/50"
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
