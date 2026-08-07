// One published programme in the archive grid.
//
// The card reads the list item only — no detail, no manifest. The host is a credit,
// not a third side: only FOR and AGAINST carry camp colour and the score.

import Link from "next/link";
import type { DebateSide, VideoDebateListItem } from "@/app/video-debates/types";

const SIDE_CLASS: Record<DebateSide, string> = {
  for: "text-side-for",
  against: "text-side-against",
};

export function formatProgrammeLength(durationMs: number): string {
  const totalSeconds = Math.max(Math.round(durationMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function posterAlt(debate: VideoDebateListItem): string {
  const debaters = debate.participants
    .filter((participant) => participant.role !== "host")
    .map((participant) => `${participant.label} ${participant.displayName}`)
    .join(" against ");
  return `Title frame for the video debate ${debate.motion} — ${debaters}`;
}

const VideoDebateCard = ({ debate }: { debate: VideoDebateListItem }) => {
  const host = debate.participants.find((participant) => participant.role === "host");
  const sides = debate.participants.filter((participant) => participant.role !== "host");

  return (
    <article className="border border-ink-faint bg-band">
      <Link href={`/video-debates/${debate.slug}`} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={debate.posterUrl}
          alt={posterAlt(debate)}
          className="block aspect-video w-full border-b border-ink-faint object-cover"
        />
        <div className="p-6">
          <p className="font-label text-[0.55rem] uppercase tracking-[0.25em] text-ink-soft">
            Editorial · Unranked · {formatProgrammeLength(debate.durationMs)}
          </p>
          <h2 className="mt-3 font-headline text-xl leading-snug text-ink">{debate.motion}</h2>

          <ul className="mt-4 space-y-1">
            {sides.map((participant) => (
              <li
                key={participant.role}
                className="font-label text-[0.6rem] uppercase tracking-[0.2em]"
              >
                <span className={SIDE_CLASS[participant.role as DebateSide]}>
                  {participant.label}
                </span>{" "}
                <span className="text-ink">{participant.displayName}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink">
            {debate.winner.toUpperCase()} won {debate.roundScore.for}–{debate.roundScore.against}
          </p>

          <p className="mt-3 font-body text-xs leading-relaxed text-ink-soft">
            {debate.domains.join(" · ")}
          </p>

          {host && (
            <p className="mt-3 font-body text-xs text-ink-soft">Hosted by {host.displayName}</p>
          )}
        </div>
      </Link>
    </article>
  );
};

export default VideoDebateCard;
