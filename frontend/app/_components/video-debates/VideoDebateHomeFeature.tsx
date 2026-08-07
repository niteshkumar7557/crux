// The newest published programme, on the landing page.
//
// It returns null when nothing is published or the API is down, which is why this
// feature needs no flag: the band simply does not exist before the first publication.

import Link from "next/link";
import serverApi from "@/app/axios.server";
import type { VideoDebateListResponse } from "@/app/video-debates/types";
import { formatProgrammeLength } from "./VideoDebateCard";

async function fetchNewest(): Promise<VideoDebateListResponse["debates"][number] | null> {
  try {
    const { data } = await serverApi.get<VideoDebateListResponse>("/video-debates", {
      params: { page: 1, pageSize: 1 },
    });
    return data.debates[0] ?? null;
  } catch {
    return null;
  }
}

const VideoDebateHomeFeature = async () => {
  const debate = await fetchNewest();
  if (!debate) return null;

  const sides = debate.participants.filter((participant) => participant.role !== "host");

  return (
    <section className="border-y border-ink-faint bg-band py-16">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2 md:items-center md:px-8">
        <div data-reveal>
          {/* Programme content, not a landing engraving: no plate, no parallax. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={debate.posterUrl}
            alt={`Title frame for the video debate ${debate.motion}`}
            className="block aspect-video w-full border border-ink-faint object-cover"
          />
        </div>

        <div data-reveal>
          <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
            <span aria-hidden className="h-px w-8 bg-ink-faint" />
            Video debate · Editorial · Unranked
          </p>
          <h2 className="mt-5 font-headline text-2xl leading-snug text-ink md:text-3xl">
            {debate.motion}
          </h2>

          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            {sides.map((participant) => (
              <li
                key={participant.role}
                className="font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft"
              >
                {participant.label} · <span className="text-ink">{participant.displayName}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink">
            {debate.winner.toUpperCase()} won {debate.roundScore.for}–{debate.roundScore.against} ·{" "}
            {formatProgrammeLength(debate.durationMs)}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              href={`/video-debates/${debate.slug}`}
              className="inline-flex border border-ink-faint bg-paper px-6 py-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink hover:bg-ink-wash"
            >
              Watch the programme →
            </Link>
            <Link
              href="/video-debates"
              className="font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft hover:text-ink"
            >
              All video debates
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoDebateHomeFeature;
