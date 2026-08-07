// One round's attributed points, drawn as a clash: FOR left, AGAINST right, a
// hairline spine between them. The same component serves the record and the
// takeover, so the arguments cannot read two ways depending on where you meet them.
//
// See design-system.md §15 (the spine) and §3 (framed, not filled, case titles).

import type { DebateSide, Point } from "@/app/video-debates/types";

const HEAD_CLASS: Record<DebateSide, string> = {
  for: "border-side-for/50 text-side-for",
  against: "border-side-against/50 text-side-against",
};

const NUMERAL_CLASS: Record<DebateSide, string> = {
  for: "text-side-for",
  against: "text-side-against",
};

const SCALE = {
  record: { head: "text-sm", body: "text-base", gap: "gap-6", pad: "p-5" },
  takeover: { head: "text-lg", body: "text-lg md:text-xl", gap: "gap-8", pad: "p-6 md:p-8" },
} as const;

const KeyArguments = ({
  points,
  scale,
}: {
  points: Record<DebateSide, Point[]>;
  scale: keyof typeof SCALE;
}) => {
  const size = SCALE[scale];

  return (
    <div
      className={`grid ${size.gap} border border-ink-faint bg-band ${size.pad} sm:grid-cols-2 sm:divide-x sm:divide-ink-faint`}
    >
      {(["for", "against"] as const).map((side) => (
        <div key={side} className="sm:first:pr-6 sm:last:pl-6">
          <p
            className={`inline-block border px-4 py-1.5 font-label uppercase tracking-[0.28em] ${HEAD_CLASS[side]} ${size.head}`}
          >
            {side.toUpperCase()}
          </p>
          {points[side].length === 0 ? (
            <p className={`mt-4 font-body italic leading-relaxed text-ink-soft ${size.body}`}>
              No point attributed yet.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {points[side].map((point, index) => (
                <li key={point.segment_id} className="flex gap-3">
                  <span
                    className={`shrink-0 font-label text-[0.7rem] uppercase tracking-[0.2em] ${NUMERAL_CLASS[side]}`}
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={`font-body leading-relaxed text-ink ${size.body}`}>
                    {point.text}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
};

export default KeyArguments;
