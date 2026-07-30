// Progress through the tier ladder. Spec: game-theory.md §13

import { TIER_LADDER, tierProgress } from "@/app/_utils/logicScore";

const LAST = TIER_LADDER.length - 1;

const stopPct = (i: number) => (i / LAST) * 100;

const TierLadder = ({ logic }: { logic: number }) => {
  const p = tierProgress(logic);
  const fill = stopPct(p.index + (p.nextTier ? p.pct : 0));

  return (
    <section aria-label="Tier progress" className="mb-12">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <span className="font-label text-[10px] uppercase tracking-[0.25em] text-ink-soft">
          Tier
        </span>
        <span className="font-label text-[10px] uppercase tracking-widest text-laurel">
          {p.nextTier
            ? `${p.toNext} logic to ${p.nextTier}`
            : `Top tier — ${logic.toLocaleString("en-US")} logic`}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill)}
        aria-valuetext={
          p.nextTier
            ? `${p.tier} — ${p.toNext} logic to ${p.nextTier}`
            : `${p.tier}, the top tier`
        }
        className="relative h-2 bg-ink-faint"
      >
        <div
          className="absolute inset-y-0 left-0 bg-laurel"
          style={{ width: `${fill}%` }}
        />
        {TIER_LADDER.slice(1, LAST).map((t, i) => (
          <span
            key={t.tier}
            aria-hidden
            className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-paper"
            style={{ left: `${stopPct(i + 1)}%` }}
          />
        ))}
      </div>

      <ol className="relative mt-3 h-9">
        {TIER_LADDER.map((t, i) => (
          <li
            key={t.tier}
            className={`absolute top-0 flex flex-col gap-1 whitespace-nowrap ${
              i === 0 ? "text-left" : i === LAST ? "text-right" : "text-center"
            }`}
            style={{
              left: `${stopPct(i)}%`,
              transform:
                i === 0
                  ? undefined
                  : i === LAST
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            <span
              className={`font-label text-[9px] sm:text-[10px] uppercase tracking-[0.08em] ${
                i === p.index ? "text-laurel" : "text-ink-soft"
              }`}
            >
              {t.tier}
            </span>
            <span className="font-label text-[9px] sm:text-[10px] text-ink-soft">
              {t.at}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default TierLadder;
