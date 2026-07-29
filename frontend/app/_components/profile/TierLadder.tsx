import { TIER_LADDER, tierProgress } from "@/app/_utils/logicScore";

const LAST = TIER_LADDER.length - 1;

// Where a rung sits along the track. The ladder's five stops are *points* on a
// four-segment climb — Beginner pinned to the left edge, Master to the right —
// so the fill advances continuously and never leaps a band on a rank-up.
//
// This is the scale the fill was already drawn on; the legend was not. The
// labels used to sit in a five-column grid, which puts each marker at the left
// edge of its own fifth: Master's dot landed at 80% while the bar called Master
// 100%, so the bar and its own legend disagreed by a full segment.
const stopPct = (i: number) => (i / LAST) * 100;

// §9: "Progress you can feel long before you are anywhere near a leaderboard."
// The five stops carry their real thresholds, so the ladder states the rule
// rather than implying it.
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

      {/* The track reads as a groove rather than a hairline. It was
          `h-px bg-raised`, and `raised` is *lighter* than the page in light
          mode — the unfilled remainder of the bar had nothing to show against
          and simply was not there. */}
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
        {/* Notches in the page colour cut the bar at every rank boundary, so
            the four climbs are countable at a glance and you can see which band
            you are standing in. The outer two stops are the bar's own ends and
            need no notch cut into them. */}
        {TIER_LADDER.slice(1, LAST).map((t, i) => (
          <span
            key={t.tier}
            aria-hidden
            className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-paper"
            style={{ left: `${stopPct(i + 1)}%` }}
          />
        ))}
      </div>

      {/* Absolutely positioned against the same scale as the track, so every
          label sits under the notch it names. The end stops are pulled inside
          the bar rather than centred on it, or they would hang off both edges. */}
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
