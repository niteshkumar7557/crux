"use client";

// The whole programme: stage, one control surface, structure, and every reveal.
//
// The host playhead is the only input to what is on screen. Everything below the
// stage is recomputed from it, so a backward seek takes state away exactly the way a
// forward seek gave it.

import { useEffect, useMemo, useRef, useState } from "react";
import { captionTrackSrc, type VideoDebateDetailResponse } from "@/app/video-debates/types";
import { layoutAt, revealAt } from "./timeline.logic";
import { useSynchronizedVideos } from "./useSynchronizedVideos";
import ThreeStreamStage from "./ThreeStreamStage";
import PlayerControls from "./PlayerControls";
import SegmentedTimeline from "./SegmentedTimeline";
import MediaErrorNotice from "./MediaErrorNotice";
import ScoreRail from "./ScoreRail";
import RoundRecords from "./RoundRecords";
import VerdictTakeover from "./VerdictTakeover";
import { verdictCueAt, type VerdictCue } from "./verdictGate.logic";
import { createPlaybackReporter } from "./mediaTelemetry";

const VideoDebateExperience = ({ detail }: { detail: VideoDebateDetailResponse }) => {
  const { debate, manifest } = detail;
  const { hostRef, forRef, againstRef, controller, snapshot, setCaptionsMode } =
    useSynchronizedVideos();
  const [captionsOn, setCaptionsOn] = useState(true);

  const reporter = useMemo(
    () => createPlaybackReporter({ slug: debate.slug, durationMs: debate.durationMs }),
    [debate.slug, debate.durationMs],
  );
  const reported = useRef({ playing: false, buffering: false, fatal: false, degraded: "" });

  const currentMs = Math.round(snapshot.currentTimeSeconds * 1000);
  const reveal = useMemo(() => revealAt(manifest, currentMs), [manifest, currentMs]);
  const layout = useMemo(() => layoutAt(manifest, currentMs), [manifest, currentMs]);

  const [cue, setCue] = useState<VerdictCue | null>(null);
  const lastMs = useRef(0);

  // The playhead is sampled every frame; this compares each step against the
  // boundaries and stops the programme when one is crossed forward.
  useEffect(() => {
    const previous = lastMs.current;
    lastMs.current = currentMs;
    if (cue || snapshot.fatal) return;
    const crossed = verdictCueAt(manifest, previous, currentMs, snapshot.playing);
    if (!crossed) return;
    setCue(crossed);
    controller?.pause();
  }, [currentMs, manifest, snapshot.playing, snapshot.fatal, cue, controller]);

  // Telemetry follows the snapshot rather than the controls, so a resume the group
  // performed on its own is reported the same way a click is.
  useEffect(() => {
    const seen = reported.current;
    if (snapshot.playing && !seen.playing) reporter.playStart(currentMs);
    seen.playing = snapshot.playing;

    if (snapshot.buffering && !seen.buffering) reporter.bufferStart("host", currentMs);
    if (!snapshot.buffering && seen.buffering) reporter.bufferEnd("host", currentMs);
    seen.buffering = snapshot.buffering;

    if (snapshot.fatal && !seen.fatal) reporter.hostError(currentMs);
    seen.fatal = snapshot.fatal;

    const degraded = (["for", "against"] as const)
      .filter((role) => snapshot.tracks[role] === "unavailable")
      .join(",");
    for (const role of ["for", "against"] as const) {
      if (degraded.includes(role) && !seen.degraded.includes(role)) {
        reporter.followerDegraded(role, currentMs);
      }
    }
    seen.degraded = degraded;

    if (snapshot.playing) reporter.progress(currentMs);
  }, [snapshot, currentMs, reporter]);

  return (
    <article className="mx-auto max-w-6xl px-6 py-10 md:px-8">
      <header className="mb-8">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          Editorial · Unranked
        </p>
        <h1 className="mt-5 font-headline text-4xl leading-tight text-ink sm:text-5xl md:text-6xl">
          {debate.motion}
        </h1>
        <p className="mt-4 font-body text-sm leading-relaxed text-ink-soft">
          A judged video programme. It does not affect Arena records, logic scores or the
          leaderboard.
        </p>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          {debate.participants.map((participant) => (
            <li key={participant.role} className="font-label text-[0.6rem] uppercase tracking-[0.2em] text-ink-soft">
              {participant.label} ·{" "}
              {participant.username ? (
                <a href={`/profile/${participant.username}`} className="text-ink hover:underline">
                  {participant.displayName}
                </a>
              ) : (
                <span className="text-ink">{participant.displayName}</span>
              )}
            </li>
          ))}
        </ul>
      </header>

      <ThreeStreamStage
        layout={layout}
        participants={debate.participants}
        media={debate.media}
        posterUrl={debate.posterUrl}
        captionsSrc={captionTrackSrc(debate.captionsPath)}
        refs={{ host: hostRef, for: forRef, against: againstRef }}
        tracks={snapshot.tracks}
        onRetry={(track) => controller?.retry(track)}
      />

      <div className="mt-4 space-y-4">
        <PlayerControls
          snapshot={snapshot}
          captionsOn={captionsOn}
          onPlayPause={() => {
            if (!controller) return;
            if (snapshot.playing) controller.pause();
            else void controller.play();
          }}
          onSeek={(seconds) => controller?.seek(seconds)}
          onRate={(rate) => controller?.setPlaybackRate(rate)}
          onVolume={(volume) => controller?.setVolume(volume)}
          onMuteToggle={() => controller?.setMuted(!snapshot.muted)}
          onCaptionsToggle={() => {
            setCaptionsMode(!captionsOn);
            setCaptionsOn(!captionsOn);
          }}
        />
        <SegmentedTimeline
          manifest={manifest}
          revealedRoundNumbers={reveal.revealedRoundNumbers}
          currentMs={currentMs}
          onSeek={(seconds) => controller?.seek(seconds)}
        />
        <MediaErrorNotice snapshot={snapshot} onRetry={(track) => controller?.retry(track)} />
      </div>

      <ScoreRail
        manifest={manifest}
        revealedRoundNumbers={reveal.revealedRoundNumbers}
        roundScore={reveal.roundScore}
      />

      <div className="mt-10 space-y-10">
        <RoundRecords manifest={manifest} reveal={reveal} />
      </div>

      <VerdictTakeover
        cue={cue}
        manifest={manifest}
        onContinue={() => {
          setCue(null);
          // The final verdict closes to the record rather than resuming a programme
          // that has already ended.
          if (cue?.kind !== "final") void controller?.play();
        }}
      />
    </article>
  );
};

export default VideoDebateExperience;
