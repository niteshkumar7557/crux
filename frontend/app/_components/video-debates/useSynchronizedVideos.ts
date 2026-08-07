"use client";

// The React side of playback: wires three real <video> elements up to the
// controller, forwards their media events to it, and re-renders whenever the
// host's playhead moves.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  createPlaybackController,
  type PlaybackController,
  type PlaybackSnapshot,
  type PortEventName,
} from "./playbackController";
import type { TrackKey } from "./sync.logic";

const PORT_EVENTS: readonly PortEventName[] = [
  "waiting",
  "canplay",
  "playing",
  "seeking",
  "seeked",
  "ended",
  "error",
  "volumechange",
];

const IDLE_SNAPSHOT: PlaybackSnapshot = {
  intent: "paused",
  playing: false,
  buffering: false,
  fatal: false,
  currentTimeSeconds: 0,
  durationSeconds: 0,
  playbackRate: 1,
  volume: 1,
  muted: false,
  tracks: { host: "buffering", for: "buffering", against: "buffering" },
};

function applyCaptionMode(video: HTMLVideoElement | null, showing: boolean): void {
  const track = video?.textTracks?.[0];
  if (track) track.mode = showing ? "showing" : "hidden";
}

export interface SynchronizedVideos {
  setCaptionsMode: (showing: boolean) => void;
  hostRef: React.RefObject<HTMLVideoElement | null>;
  forRef: React.RefObject<HTMLVideoElement | null>;
  againstRef: React.RefObject<HTMLVideoElement | null>;
  controller: PlaybackController | null;
  snapshot: PlaybackSnapshot;
}

export function useSynchronizedVideos(): SynchronizedVideos {
  const hostRef = useRef<HTMLVideoElement | null>(null);
  const forRef = useRef<HTMLVideoElement | null>(null);
  const againstRef = useRef<HTMLVideoElement | null>(null);
  const [controller, setController] = useState<PlaybackController | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const forElement = forRef.current;
    const againstElement = againstRef.current;
    if (!host || !forElement || !againstElement) return;

    const created = createPlaybackController(
      { host, for: forElement, against: againstElement },
      { now: () => performance.now() },
    );
    setController(created);

    const elements: [TrackKey, HTMLVideoElement][] = [
      ["host", host],
      ["for", forElement],
      ["against", againstElement],
    ];
    const detach: (() => void)[] = [];
    for (const [key, element] of elements) {
      for (const event of PORT_EVENTS) {
        const listener = () => { created.handleEvent(key, event); };
        element.addEventListener(event, listener);
        detach.push(() => { element.removeEventListener(event, listener); });
      }
    }
    // Native timeupdate is the only playhead signal while paused or seeking.
    const onTimeUpdate = () => { created.sample(); };
    host.addEventListener("timeupdate", onTimeUpdate);
    detach.push(() => { host.removeEventListener("timeupdate", onTimeUpdate); });

    let cancelled = false;
    let handle = 0;
    let usingFrameCallback = false;
    const schedule = () => {
      if (cancelled) return;
      if (typeof host.requestVideoFrameCallback === "function" && !host.paused) {
        usingFrameCallback = true;
        handle = host.requestVideoFrameCallback(step);
        return;
      }
      usingFrameCallback = false;
      handle = requestAnimationFrame(step);
    };
    const step = () => {
      created.sample();
      schedule();
    };
    schedule();

    return () => {
      cancelled = true;
      if (usingFrameCallback) host.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
      for (const off of detach) off();
      created.destroy();
      setController(null);
    };
  }, []);

  // The caption track belongs to the host element this hook owns, so its mode is
  // set here rather than by a consumer reaching through the ref.
  const setCaptionsMode = useCallback((showing: boolean) => {
    applyCaptionMode(hostRef.current, showing);
  }, []);

  const subscribe = useCallback(
    (listener: () => void) => (controller ? controller.subscribe(listener) : () => {}),
    [controller],
  );
  const getSnapshot = useCallback(
    () => controller?.getSnapshot() ?? IDLE_SNAPSHOT,
    [controller],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => IDLE_SNAPSHOT);

  return { hostRef, forRef, againstRef, controller, snapshot, setCaptionsMode };
}
