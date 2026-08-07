"use client";

// One control surface for three elements. The native `controls` attribute stays off
// on all three videos, so this is the only thing that can move the programme.

import type { PlaybackSnapshot } from "./playbackController";

const SPEEDS = [0.5, 1, 1.25, 1.5, 2] as const;

const SPEED_CLASS = {
  on: "border-ink bg-ink text-paper",
  off: "border-ink-faint bg-paper text-ink-soft hover:border-ink",
} as const;

function clock(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}

const PlayerControls = ({
  snapshot,
  captionsOn,
  onPlayPause,
  onSeek,
  onRate,
  onVolume,
  onMuteToggle,
  onCaptionsToggle,
}: {
  snapshot: PlaybackSnapshot;
  captionsOn: boolean;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onRate: (rate: number) => void;
  onVolume: (volume: number) => void;
  onMuteToggle: () => void;
  onCaptionsToggle: () => void;
}) => {
  const duration = snapshot.durationSeconds;
  const disabled = snapshot.fatal;

  return (
    <div className="border border-ink-faint bg-band p-4">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onPlayPause}
          disabled={disabled}
          aria-pressed={snapshot.playing}
          className="border border-ink-faint px-5 py-2.5 font-label text-[0.62rem] uppercase tracking-[0.25em] text-ink hover:bg-ink-wash disabled:opacity-40"
        >
          {snapshot.playing ? "Pause" : "Play"}
        </button>

        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 1}
          step={0.1}
          value={Math.min(snapshot.currentTimeSeconds, duration > 0 ? duration : 1)}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          disabled={disabled}
          aria-label="Seek through the programme"
          className="h-1 min-w-40 flex-1 cursor-pointer accent-ink"
        />

        <p className="font-label text-[0.62rem] uppercase tracking-[0.2em] text-ink-soft tabular-nums">
          {clock(snapshot.currentTimeSeconds)} / {clock(duration)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-faint pt-4">
        <button
          type="button"
          onClick={onMuteToggle}
          aria-pressed={snapshot.muted}
          className="border border-ink-faint px-4 py-2 font-label text-[0.6rem] uppercase tracking-[0.25em] text-ink hover:bg-ink-wash"
        >
          {snapshot.muted ? "Unmute" : "Mute"}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={snapshot.volume}
          onChange={(event) => onVolume(Number(event.currentTarget.value))}
          aria-label="Host volume"
          className="h-1 w-28 cursor-pointer accent-ink"
        />

        <button
          type="button"
          onClick={onCaptionsToggle}
          aria-pressed={captionsOn}
          className="border border-ink-faint px-4 py-2 font-label text-[0.6rem] uppercase tracking-[0.25em] text-ink hover:bg-ink-wash"
        >
          Captions {captionsOn ? "on" : "off"}
        </button>

        <div className="flex items-center gap-2">
          <span className="font-label text-[0.55rem] uppercase tracking-[0.2em] text-ink-soft">
            Speed
          </span>
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onRate(speed)}
              aria-pressed={snapshot.playbackRate === speed}
              className={`border px-3 py-1.5 font-label text-[0.55rem] uppercase tracking-[0.2em] ${
                snapshot.playbackRate === speed ? SPEED_CLASS.on : SPEED_CLASS.off
              }`}
            >
              {speed}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
