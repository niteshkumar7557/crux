"use client";

// Three native video elements on one timeline.
//
// The three tiles never leave the DOM and never change order in it: only their grid
// placement changes, because unmounting a <video> would drop its buffer and its
// place in the programme. Identity stays on the tile at every size.

import type { RefObject } from "react";
import { useHydrated } from "@/app/_hooks/useHydrated";
import type { ParticipantRole, PublicParticipant } from "@/app/video-debates/types";
import type { StageLayout } from "./timeline.logic";
import type { TileState } from "./playbackController";
import type { TrackKey } from "./sync.logic";

// Tailwind cannot see class names built at runtime, so placement is a lookup of
// literal strings rather than an interpolation.
const PRIMARY_SOLO =
  "col-span-2 order-1 md:col-start-1 md:col-end-3 md:row-start-1 md:row-end-3";
const CONTEXT_TOP = "order-2 md:col-start-3 md:row-start-1";
const CONTEXT_BOTTOM = "order-3 md:col-start-3 md:row-start-2";
const GRACE_FOR = "order-1 md:col-start-1 md:row-start-1 md:row-end-3";
const GRACE_AGAINST = "order-2 md:col-start-2 md:row-start-1 md:row-end-3";
const GRACE_HOST =
  "col-span-2 order-3 md:col-span-1 md:col-start-3 md:row-start-1 md:row-end-3 md:self-center";

const ROLE_ACCENT: Record<ParticipantRole, string> = {
  host: "text-ink-soft",
  for: "text-side-for",
  against: "text-side-against",
};

const ROLE_EDGE: Record<ParticipantRole, string> = {
  host: "border-ink-faint",
  for: "border-side-for/50",
  against: "border-side-against/50",
};

export interface StageRefs {
  host: RefObject<HTMLVideoElement | null>;
  for: RefObject<HTMLVideoElement | null>;
  against: RefObject<HTMLVideoElement | null>;
}

function placementFor(layout: StageLayout, role: ParticipantRole): string {
  if (layout.mode === "grace") {
    if (role === "for") return GRACE_FOR;
    if (role === "against") return GRACE_AGAINST;
    return GRACE_HOST;
  }
  if (layout.primary.includes(role)) return PRIMARY_SOLO;
  return layout.contextual[0] === role ? CONTEXT_TOP : CONTEXT_BOTTOM;
}

const ThreeStreamStage = ({
  layout,
  participants,
  media,
  posterUrl,
  captionsSrc,
  refs,
  tracks,
  onRetry,
}: {
  layout: StageLayout;
  participants: PublicParticipant[];
  media: Record<ParticipantRole, string>;
  posterUrl: string;
  captionsSrc: string;
  refs: StageRefs;
  tracks: Record<TrackKey, TileState>;
  onRetry: (track: TrackKey) => void;
}) => {
  // Server-rendered markup carries native controls so the programme is playable
  // with JavaScript off; the controller takes over the moment it hydrates.
  const hydrated = useHydrated();

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:grid-rows-2">
      {participants.map((participant) => {
      const role = participant.role;
      const speaking = layout.primary.includes(role);
      const state = tracks[role];
      return (
        <figure
          key={role}
          className={`relative m-0 border bg-band ${ROLE_EDGE[role]} ${placementFor(layout, role)}`}
        >
          <video
            ref={refs[role]}
            src={media[role]}
            poster={role === "host" ? posterUrl : undefined}
            muted={role !== "host"}
            crossOrigin="anonymous"
            playsInline
            preload="metadata"
            controls={role === "host" && !hydrated}
            className="block aspect-video w-full bg-paper object-cover"
          >
            {role === "host" && (
              <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />
            )}
          </video>

          {/* Opaque paper, not a scrim: ink inverts between themes, so cream type
              over a dark scrim disappears at night. */}
          {state === "unavailable" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-band p-4 text-center">
              <p className="font-label text-[0.6rem] uppercase tracking-[0.25em] text-ink-soft">
                {role === "host" ? "Programme stopped" : "Angle unavailable"}
              </p>
              {role !== "host" && (
                <button
                  type="button"
                  onClick={() => onRetry(role)}
                  className="border border-ink-faint px-4 py-2 font-label text-[0.6rem] uppercase tracking-[0.25em] text-ink hover:bg-ink-wash"
                >
                  Retry angle
                </button>
              )}
            </div>
          )}

          <figcaption className="flex items-baseline justify-between gap-3 border-t border-ink-faint px-3 py-2">
            <span className={`font-label text-[0.55rem] uppercase tracking-[0.25em] ${ROLE_ACCENT[role]}`}>
              {participant.label}
            </span>
            <span className="truncate font-body text-base text-ink">{participant.displayName}</span>
            <span className="font-label text-[0.5rem] uppercase tracking-[0.2em] text-ink-soft">
              {state === "buffering" ? "Buffering" : speaking ? "Speaking" : ""}
            </span>
          </figcaption>
        </figure>
      );
      })}
    </div>
  );
};

export default ThreeStreamStage;
