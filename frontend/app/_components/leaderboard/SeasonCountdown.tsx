"use client";

// Time left in the season. Spec: game-theory.md §14, §19

import { useEffect, useState } from "react";

const SEGMENTS = ["Days", "Hrs", "Min", "Sec"] as const;

function split(msLeft: number): string[] {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return [
    Math.floor(s / 86_400),
    Math.floor((s % 86_400) / 3600),
    Math.floor((s % 3600) / 60),
    s % 60,
  ].map((n) => String(n).padStart(2, "0"));
}

const SeasonCountdown = ({
  endsAt,
  season,
}: {
  endsAt: string;
  season: number;
}) => {
  const target = new Date(endsAt).getTime();
  const [left, setLeft] = useState(() => target - Date.now());

  useEffect(() => {
    const tick = () => setLeft(target - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);

  if (!Number.isFinite(target)) return null;

  const parts = split(left);

  return (
    <div className="flex flex-col md:items-end">
      <span className="mb-1 font-label text-[10px] uppercase tracking-widest text-ink-soft">
        Season {season} closes in
      </span>
      <div
        className="flex items-start gap-1"
        suppressHydrationWarning
        aria-label={`Season ${season} closes in ${parts[0]} days, ${parts[1]} hours, ${parts[2]} minutes, ${parts[3]} seconds`}
      >
        {parts.map((value, i) => (
          <div key={SEGMENTS[i]} className="flex items-start" aria-hidden>
            {i > 0 && (
              <span className="font-label text-3xl font-bold leading-none text-ink-soft">
                :
              </span>
            )}
            <span className="flex flex-col items-center">
              <span
                suppressHydrationWarning
                className="font-label text-3xl font-bold leading-none tabular-nums tracking-tighter text-ink"
              >
                {value}
              </span>
              <span className="mt-1 font-label text-[9px] uppercase tracking-[0.18em] text-ink-soft">
                {SEGMENTS[i]}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeasonCountdown;
