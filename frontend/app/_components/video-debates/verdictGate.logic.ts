// Whether the playhead just crossed something the reader should be stopped for.
//
// Pure, and deliberately memoryless: the caller passes both ends of the step, so
// seeking back and replaying a round is a second crossing and stops you again.

import type { PlaybackManifestV1 } from "@/app/video-debates/types";

// The largest step that can be playback rather than a seek. At 2× a sampled frame
// advances tens of milliseconds; a scrub jumps seconds. Display-only — not a game
// constant, and it must never reach /rules.
export const MAX_PLAYBACK_STEP_MS = 1_500;

export type VerdictCue = { kind: "round"; round: number } | { kind: "final" };

function crossed(boundaryMs: number, previousMs: number, currentMs: number): boolean {
  return previousMs < boundaryMs && currentMs >= boundaryMs;
}

export function verdictCueAt(
  manifest: PlaybackManifestV1,
  previousMs: number,
  currentMs: number,
  playing: boolean,
): VerdictCue | null {
  if (!playing) return null;
  const step = currentMs - previousMs;
  if (step <= 0 || step > MAX_PLAYBACK_STEP_MS) return null;

  const outro = manifest.timeline[manifest.timeline.length - 1];
  if (outro.type === "outro" && crossed(outro.end_ms, previousMs, currentMs)) {
    return { kind: "final" };
  }

  for (const entry of manifest.timeline) {
    if (entry.type !== "round") continue;
    if (crossed(entry.grace.end_ms, previousMs, currentMs)) {
      return { kind: "round", round: entry.number };
    }
  }
  return null;
}
