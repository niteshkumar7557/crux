"use client";

// The programme drawn as its real structure: intro, ten judged turns, five grace
// periods, outro. Structure is always visible; an outcome is not. A round only takes
// its winner's colour once revealAt() says that round has been ruled.

import type { PlaybackManifestV1, RoundResult, RoundTimeline } from "@/app/video-debates/types";

interface Segment {
  key: string;
  label: string;
  startMs: number;
  endMs: number;
  tone: "neutral" | "for" | "against" | "grace" | "revealed-for" | "revealed-against";
}

const TONE_CLASS = {
  neutral: "bg-ink-wash",
  for: "bg-side-for/25",
  against: "bg-side-against/25",
  grace: "bg-ink-faint",
  "revealed-for": "bg-side-for",
  "revealed-against": "bg-side-against",
} as const;

function segmentsFor(
  manifest: PlaybackManifestV1,
  revealedRoundNumbers: number[],
): Segment[] {
  const revealed = new Set(revealedRoundNumbers);
  const resultOf = new Map<number, RoundResult>(
    manifest.rounds.map((result) => [result.number, result]),
  );
  const segments: Segment[] = [];

  for (const entry of manifest.timeline) {
    if (entry.type === "intro") {
      segments.push({ key: "intro", label: "Introduction", startMs: entry.start_ms, endMs: entry.end_ms, tone: "neutral" });
      continue;
    }
    if (entry.type === "outro") {
      segments.push({ key: "outro", label: "Verdict", startMs: entry.start_ms, endMs: entry.end_ms, tone: "neutral" });
      continue;
    }
    const round: RoundTimeline = entry;
    const first = round.opener === "for" ? "for" : "against";
    const second = round.opener === "for" ? "against" : "for";
    const windows = [
      { side: first, range: first === "for" ? round.for : round.against },
      { side: second, range: second === "for" ? round.for : round.against },
    ] as const;
    for (const window of windows) {
      segments.push({
        key: `r${round.number}-${window.side}`,
        label: `Round ${round.number} · ${round.domain} · ${window.side.toUpperCase()}`,
        startMs: window.range.start_ms,
        endMs: window.range.end_ms,
        tone: window.side,
      });
    }
    const result = resultOf.get(round.number);
    const ruled = revealed.has(round.number) && result !== undefined;
    segments.push({
      key: `r${round.number}-grace`,
      label: ruled
        ? `Round ${round.number} · ${round.domain} · ruled for ${result.winner.toUpperCase()}`
        : `Round ${round.number} · ${round.domain} · open discussion`,
      startMs: round.grace.start_ms,
      endMs: round.grace.end_ms,
      tone: ruled ? (result.winner === "for" ? "revealed-for" : "revealed-against") : "grace",
    });
  }
  return segments;
}

const SegmentedTimeline = ({
  manifest,
  revealedRoundNumbers,
  currentMs,
  onSeek,
}: {
  manifest: PlaybackManifestV1;
  revealedRoundNumbers: number[];
  currentMs: number;
  onSeek: (seconds: number) => void;
}) => {
  const segments = segmentsFor(manifest, revealedRoundNumbers);

  return (
    <div>
      <div className="flex h-8 w-full gap-px overflow-hidden border border-ink-faint bg-paper">
        {segments.map((segment) => {
          const width = ((segment.endMs - segment.startMs) / manifest.duration_ms) * 100;
          const active = currentMs >= segment.startMs && currentMs < segment.endMs;
          return (
            <button
              key={segment.key}
              type="button"
              style={{ width: `${width}%` }}
              onClick={() => onSeek(segment.startMs / 1000)}
              title={segment.label}
              aria-label={`Jump to ${segment.label}`}
              aria-current={active ? "true" : undefined}
              className={`h-full ${TONE_CLASS[segment.tone]} ${active ? "outline outline-2 -outline-offset-2 outline-ink" : ""}`}
            />
          );
        })}
      </div>
      <p className="mt-2 font-label text-[0.55rem] uppercase tracking-[0.2em] text-ink-soft">
        Intro · ten judged turns · five grace periods · verdict
      </p>
    </div>
  );
};

export default SegmentedTimeline;
