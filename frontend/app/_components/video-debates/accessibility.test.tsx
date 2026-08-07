import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { videoDebateFixture } from "./videoDebate.fixture";
import { layoutAt, revealAt } from "./timeline.logic";
import type { PlaybackSnapshot } from "./playbackController";
import ThreeStreamStage from "./ThreeStreamStage";
import PlayerControls from "./PlayerControls";
import ScoreRail from "./ScoreRail";
import KeyArguments from "./KeyArguments";
import RoundRecords from "./RoundRecords";
import VerdictPanel from "./VerdictPanel";
import MediaErrorNotice from "./MediaErrorNotice";
import VideoDebateExperience from "./VideoDebateExperience";

const detail = videoDebateFixture;
const manifest = detail.manifest;

const refs = {
  host: { current: null },
  for: { current: null },
  against: { current: null },
};

function snapshot(overrides: Partial<PlaybackSnapshot> = {}): PlaybackSnapshot {
  return {
    intent: "paused",
    playing: false,
    buffering: false,
    fatal: false,
    currentTimeSeconds: 0,
    durationSeconds: 480,
    playbackRate: 1,
    volume: 1,
    muted: false,
    tracks: { host: "ready", for: "ready", against: "ready" },
    ...overrides,
  };
}

describe("video debate accessibility structure", () => {
  it("all three media tiles retain visible role and participant labels", () => {
    const markup = renderToStaticMarkup(
      <ThreeStreamStage
        layout={layoutAt(manifest, 90_000)}
        participants={detail.debate.participants}
        media={detail.debate.media}
        posterUrl={detail.debate.posterUrl}
        captionsSrc="/api/video-debates/applied-learning/captions.vtt"
        refs={refs}
        tracks={{ host: "ready", for: "ready", against: "ready" }}
        onRetry={() => {}}
      />,
    );

    for (const participant of detail.debate.participants) {
      expect(markup).toContain(participant.label);
      expect(markup).toContain(participant.displayName);
    }
  });

  it("the host video carries native controls before hydration so a no-JS reader can play it", () => {
    const markup = renderToStaticMarkup(
      <ThreeStreamStage
        layout={layoutAt(manifest, 90_000)}
        participants={detail.debate.participants}
        media={detail.debate.media}
        posterUrl={detail.debate.posterUrl}
        captionsSrc="/api/video-debates/applied-learning/captions.vtt"
        refs={refs}
        tracks={{ host: "ready", for: "ready", against: "ready" }}
        onRetry={() => {}}
      />,
    );

    // Exactly one: the followers are silent panes driven by the host.
    expect(markup.match(/controls=""/g) ?? []).toHaveLength(1);
    const host = markup.slice(markup.indexOf("<video"), markup.indexOf("</video>"));
    expect(host).toContain("controls");
  });

  it("controls expose play, seek, volume, captions, and speed names", () => {
    const markup = renderToStaticMarkup(
      <PlayerControls
        snapshot={snapshot()}
        captionsOn
        onPlayPause={() => {}}
        onSeek={() => {}}
        onRate={() => {}}
        onVolume={() => {}}
        onMuteToggle={() => {}}
        onCaptionsToggle={() => {}}
      />,
    );

    expect(markup).toContain(">Play<");
    expect(markup).toContain('aria-label="Seek through the programme"');
    expect(markup).toContain('aria-label="Host volume"');
    expect(markup).toMatch(/Captions/);
    for (const speed of ["0.5", "1.25", "1.5", "2"]) {
      expect(markup).toContain(`${speed}×`);
    }
  });

  it("the rail states every outcome in text, never in colour alone", () => {
    const reveal = revealAt(manifest, 200_000);
    const markup = renderToStaticMarkup(
      <ScoreRail
        manifest={manifest}
        revealedRoundNumbers={reveal.revealedRoundNumbers}
        roundScore={reveal.roundScore}
      />,
    );

    expect(markup).toContain("Not yet ruled");
    expect(markup).toMatch(/FOR \d+/);
    expect(markup).toMatch(/AGAINST \d+/);
    expect(markup).toContain("Round 5");
    // The running score is not an announcement; only one live region exists.
    expect(markup).not.toContain("aria-live");
  });

  it("key arguments name both sides in text and state an absence rather than showing an empty column", () => {
    const populated = renderToStaticMarkup(
      <KeyArguments
        points={{
          for: [{ segment_id: "a", text: "The first point for." }],
          against: [],
        }}
        scale="record"
      />,
    );

    expect(populated).toContain("FOR");
    expect(populated).toContain("AGAINST");
    expect(populated).toContain("The first point for.");
    expect(populated).toContain("No point attributed");
  });

  it("the takeover scale renders the same arguments as the record scale", () => {
    const points = {
      for: [{ segment_id: "a", text: "Shared argument text." }],
      against: [{ segment_id: "b", text: "Opposing argument text." }],
    };
    for (const scale of ["record", "takeover"] as const) {
      const markup = renderToStaticMarkup(<KeyArguments points={points} scale={scale} />);
      expect(markup).toContain("Shared argument text.");
      expect(markup).toContain("Opposing argument text.");
      expect(markup).not.toContain("No point attributed");
    }
  });

  it("a ruled round sets its number, domain, score and ruling as the record", () => {
    const reveal = revealAt(manifest, 200_000);
    const markup = renderToStaticMarkup(<RoundRecords manifest={manifest} reveal={reveal} />);

    const ruled = manifest.rounds.find((r) => reveal.revealedRoundNumbers.includes(r.number));
    if (!ruled) throw new Error("fixture has no ruled round at 200s");
    expect(markup).toContain(`Round ${ruled.number}`);
    expect(markup).toContain(ruled.ruling);
    expect(markup).toContain(ruled.winner.toUpperCase());
  });

  it("an unruled round keeps its structure and withholds its outcome", () => {
    const reveal = revealAt(manifest, 200_000);
    const markup = renderToStaticMarkup(<RoundRecords manifest={manifest} reveal={reveal} />);

    const unruled = manifest.rounds.find((r) => !reveal.revealedRoundNumbers.includes(r.number));
    if (!unruled) throw new Error("fixture has no unruled round at 200s");
    expect(markup).toContain("Not ruled yet");
    expect(markup).not.toContain(unruled.ruling);
  });

  it("the round takeover is a labelled modal dialog carrying the ruling and both sides", () => {
    const round = manifest.rounds[0];
    const markup = renderToStaticMarkup(
      <VerdictPanel
        cue={{ kind: "round", round: round.number }}
        manifest={manifest}
        onContinue={() => {}}
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain(`Round ${round.number}`);
    expect(markup).toContain(round.ruling);
    expect(markup).toContain(round.winner.toUpperCase());
    expect(markup).toContain("Continue");
    // The dialog must not add a second live region to the page.
    expect(markup).not.toContain("aria-live");
  });

  it("the final takeover carries the crux and the verdict, not a round ruling", () => {
    const markup = renderToStaticMarkup(
      <VerdictPanel cue={{ kind: "final" }} manifest={manifest} onContinue={() => {}} />,
    );

    expect(markup).toContain(manifest.final.crux);
    expect(markup).toContain(manifest.final.verdict);
    expect(markup).toContain(manifest.final.winner.toUpperCase());
    expect(markup).toContain("Read the record");
  });

  it("only restrained result announcements use aria-live", () => {
    const markup = renderToStaticMarkup(<VideoDebateExperience detail={detail} />);

    expect(markup.match(/aria-live/g)).toHaveLength(1);
    expect(markup).toContain('aria-live="polite"');
  });



  it("host and follower failure notices expose distinct retry labels", () => {
    const hostFailure = renderToStaticMarkup(
      <MediaErrorNotice snapshot={snapshot({ fatal: true })} onRetry={() => {}} />,
    );
    const followerFailure = renderToStaticMarkup(
      <MediaErrorNotice
        snapshot={snapshot({ tracks: { host: "ready", for: "unavailable", against: "ready" } })}
        onRetry={() => {}}
      />,
    );

    expect(hostFailure).toContain("Retry programme");
    expect(hostFailure).toContain('role="alert"');
    expect(followerFailure).toContain("Retry angle");
    expect(followerFailure).not.toContain("Retry programme");
  });

  it("the buffering notice is not an alert and does not stop the programme", () => {
    const markup = renderToStaticMarkup(
      <MediaErrorNotice snapshot={snapshot({ buffering: true })} onRetry={() => {}} />,
    );

    expect(markup).toContain("catches up");
    expect(markup).not.toContain('role="alert"');
  });
});
