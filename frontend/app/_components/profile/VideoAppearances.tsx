// Video debates this profile appeared in.
//
// Deliberately not a record: no W–L–D, no logic, no tier, no season band. Each row
// says what it is, so nobody reads a programme result as an Arena result.

import Link from "next/link";
import type { VideoAppearance } from "@/app/profile/types";

const ROLE_LABEL = {
  host: "Host",
  for: "FOR",
  against: "AGAINST",
} as const;

const ROLE_CLASS = {
  host: "text-ink-soft",
  for: "text-side-for",
  against: "text-side-against",
} as const;

function length(durationMs: number): string {
  const totalSeconds = Math.max(Math.round(durationMs / 1000), 0);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

const VideoAppearances = ({ appearances }: { appearances: VideoAppearance[] }) => {
  if (appearances.length === 0) return null;

  return (
    <section aria-label="Video debate appearances">
      <h2 className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
        Video debates
      </h2>
      <p className="mt-2 font-body text-sm text-ink-soft">
        Editorial · does not affect Arena record, logic or tier.
      </p>

      <ul className="mt-5 divide-y divide-ink-faint border border-ink-faint bg-band">
        {appearances.map((appearance) => (
          <li key={appearance.slug} className="px-6 py-4">
            <Link href={`/video-debates/${appearance.slug}`} className="block">
              <p className="font-label text-[0.55rem] uppercase tracking-[0.2em]">
                <span className={ROLE_CLASS[appearance.role]}>{ROLE_LABEL[appearance.role]}</span>
                <span className="text-ink-soft"> · {length(appearance.durationMs)}</span>
              </p>
              <p className="mt-2 font-body text-sm leading-snug text-ink">{appearance.motion}</p>
              <p className="mt-2 font-label text-[0.55rem] uppercase tracking-[0.2em] text-ink-soft">
                {appearance.winner.toUpperCase()} won {appearance.roundScore.for}–
                {appearance.roundScore.against}
                {appearance.sideWon === null
                  ? ""
                  : appearance.sideWon
                    ? " · their side took the programme"
                    : " · their side did not take the programme"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default VideoAppearances;
