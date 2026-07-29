import { TIER_LADDER, tierProgress } from "@/app/_utils/logicScore";

// §9: "Progress you can feel long before you are anywhere near a
// leaderboard." The five stops carry their real thresholds, so the ladder
// states the rule rather than implying it.
const TierLadder = ({ logic }: { logic: number }) => {
  const p = tierProgress(logic);

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

      <div className="relative h-px bg-raised mb-4">
        <div
          className="absolute inset-y-0 left-0 bg-laurel"
          style={{
            width: `${((p.index + (p.nextTier ? p.pct : 0)) / (TIER_LADDER.length - 1)) * 100}%`,
          }}
        />
      </div>

      <ol className="grid grid-cols-5 gap-2">
        {TIER_LADDER.map((t, i) => (
          <li key={t.tier} className="flex flex-col items-start gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                i <= p.index ? "bg-laurel" : "bg-raised"
              }`}
            />
            <span
              className={`font-label text-[10px] uppercase tracking-widest ${
                i === p.index ? "text-laurel" : "text-ink-soft"
              }`}
            >
              {t.tier}
            </span>
            <span className="font-label text-[10px] text-ink-soft">{t.at}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default TierLadder;
