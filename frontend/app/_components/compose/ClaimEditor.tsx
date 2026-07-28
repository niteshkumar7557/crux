import { LuPenLine, LuTriangleAlert } from "react-icons/lu";
import AutoGrowTextarea from "@/app/_components/ui/AutoGrowTextarea";

export const MIN_CHARS = 35;
export const MAX_CHARS = 120;
const WARN_CHARS = 105;

export function isTextInLimits(text: string) {
  return text.length >= MIN_CHARS && text.length <= MAX_CHARS;
}

const HEDGE_PATTERNS = [
  /\bmaybe\b/i,
  /\bperhaps\b/i,
  /\bi think\b/i,
  /\bkind of\b/i,
  /\bsort of\b/i,
  /\bprobably\b/i,
];

// Free local pre-checks — nudges only, never blocking.
function getNudges(text: string): string[] {
  const nudges: string[] = [];
  if (text.trim().endsWith("?")) {
    nudges.push("Questions can't be argued — make it a claim.");
  }
  if (HEDGE_PATTERNS.some((p) => p.test(text))) {
    nudges.push("The Arbiter strips hedging — commit.");
  }
  return nudges;
}

interface ClaimEditorProps {
  text: string;
  onChange: (text: string) => void;
  locked: boolean;
}

const ClaimEditor = ({ text, onChange, locked }: ClaimEditorProps) => {
  const nudges = getNudges(text);
  const remaining = MIN_CHARS - text.length;
  const counterTone =
    text.length >= MAX_CHARS
      ? "text-secondary"
      : text.length >= WARN_CHARS
        ? "text-tertiary"
        : "text-outline";

  return (
    <div className="space-y-3">
      <label
        className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-2"
        htmlFor="claim"
      >
        <LuPenLine className="text-sm" />
        YOUR CLAIM
      </label>
      <AutoGrowTextarea
        id="claim"
        maxHeight={400}
        className={`w-full focus:outline-none bg-surface-container-highest border-0 focus:ring-1 focus:ring-primary min-h-60 p-6 font-headline text-2xl italic placeholder:text-outline text-on-surface transition-opacity ${
          locked ? "opacity-60" : ""
        }`}
        placeholder="Make a claim worth fighting over..."
        value={text}
        maxLength={MAX_CHARS}
        readOnly={locked}
        aria-busy={locked}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex justify-between items-center gap-4 text-[10px] font-label text-outline uppercase tracking-tighter">
        <span>
          {remaining > 0
            ? `${remaining} MORE CHARACTER${remaining === 1 ? "" : "S"} TO SUMMON THE ARBITER`
            : "SUBSTANCE CONFIRMED — THE ARBITER AWAITS"}
        </span>
        <span className={`transition-colors ${counterTone}`}>
          {text.length} / {MAX_CHARS}
        </span>
      </div>
      {nudges.length > 0 && (
        <div className="space-y-1">
          {nudges.map((nudge) => (
            <p
              key={nudge}
              className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest text-tertiary"
            >
              <LuTriangleAlert className="text-xs shrink-0" />
              {nudge}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClaimEditor;
