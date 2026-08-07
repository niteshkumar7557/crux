// Every round, and the final verdict once it is earned.
//
// Nothing here remembers what it has already shown: a backward seek must be able
// to take a ruling off the page, which a monotonic "revealed" set cannot do.

import type {
  DebateSide,
  PlaybackManifestV1,
  Point,
  RoundTimeline,
} from "@/app/video-debates/types";
import type { RevealState } from "./timeline.logic";
import RoundRecord from "./RoundRecord";

const RoundRecords = ({
  manifest,
  reveal,
}: {
  manifest: PlaybackManifestV1;
  reveal: RevealState;
}) => {
  const visiblePoints = new Set(reveal.visiblePointIds);
  const revealed = new Set(reveal.revealedRoundNumbers);
  const lastRevealed = reveal.revealedRoundNumbers[reveal.revealedRoundNumbers.length - 1];
  const announcement = reveal.finalVisible
    ? `Final verdict: ${manifest.final.winner.toUpperCase()} wins ${manifest.final.round_score.for} to ${manifest.final.round_score.against}.`
    : lastRevealed !== undefined
      ? `Round ${lastRevealed} ruled.`
      : "";

  // The predicate is required: a plain .filter() widens to the timeline union,
  // whose intro and outro members carry neither `number` nor `domain`.
  const domainOf = new Map<number, string>(
    manifest.timeline
      .filter((entry): entry is RoundTimeline => entry.type === "round")
      .map((entry) => [entry.number, entry.domain]),
  );

  return (
    <section aria-label="The record">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ol className="space-y-12">
        {manifest.rounds.map((result) => {
          const points = {
            for: result.points.for.filter((point) => visiblePoints.has(point.segment_id)),
            against: result.points.against.filter((point) => visiblePoints.has(point.segment_id)),
          } satisfies Record<DebateSide, Point[]>;

          return (
            <RoundRecord
              key={result.number}
              result={result}
              domain={domainOf.get(result.number) ?? ""}
              ruled={revealed.has(result.number)}
              points={points}
            />
          );
        })}
      </ol>

      {reveal.finalVisible && (
        <div className="mt-16 border border-ink-faint bg-raised p-8 md:p-12">
          <p className="font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
            Final verdict
          </p>
          <p className="mt-4 display-type text-4xl text-ink md:text-6xl">
            {manifest.final.winner.toUpperCase()} {manifest.final.round_score.for}–
            {manifest.final.round_score.against}
          </p>
          <p className="mt-6 max-w-3xl font-headline text-2xl italic leading-snug text-ink md:text-3xl">
            {manifest.final.crux}
          </p>
          <p className="mt-6 max-w-3xl font-body text-lg leading-relaxed text-ink-soft">
            {manifest.final.verdict}
          </p>
        </div>
      )}
    </section>
  );
};

export default RoundRecords;
