"use client";

// Four different failures, four different sentences and retry paths. A missing angle
// is not the same event as a lost host track, and neither is buffering.

import type { PlaybackSnapshot, TileState } from "./playbackController";
import type { TrackKey } from "./sync.logic";

const ANGLE_LABEL: Record<TrackKey, string> = {
  host: "Host",
  for: "FOR",
  against: "AGAINST",
};

const MediaErrorNotice = ({
  snapshot,
  onRetry,
}: {
  snapshot: PlaybackSnapshot;
  onRetry: (track: TrackKey) => void;
}) => {
  const unavailable = (["for", "against"] as const).filter(
    (key) => snapshot.tracks[key] === ("unavailable" as TileState),
  );

  if (snapshot.fatal) {
    return (
      <div role="alert" className="border border-side-against bg-band p-6">
        <p className="font-body leading-relaxed text-ink">
          The host track carries the audio and the clock, so the programme stops without it.
        </p>
        <button
          type="button"
          onClick={() => onRetry("host")}
          className="mt-4 border border-ink-faint px-5 py-2.5 font-label text-[0.62rem] uppercase tracking-[0.25em] text-ink hover:bg-ink-wash"
        >
          Retry programme
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {snapshot.buffering && (
        <p className="border border-ink-faint bg-band px-4 py-3 font-body text-sm text-ink-soft">
          Holding the programme while an angle catches up.
        </p>
      )}
      {unavailable.map((key) => (
        <div key={key} className="flex flex-wrap items-center justify-between gap-3 border border-ink-faint bg-band px-4 py-3">
          <p className="font-body text-sm text-ink-soft">
            The {ANGLE_LABEL[key]} angle stopped loading. The debate continues on the host track.
          </p>
          <button
            type="button"
            onClick={() => onRetry(key)}
            className="border border-ink-faint px-4 py-2 font-label text-[0.6rem] uppercase tracking-[0.25em] text-ink hover:bg-ink-wash"
          >
            Retry angle
          </button>
        </div>
      ))}
    </div>
  );
};

export default MediaErrorNotice;
