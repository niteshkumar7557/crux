// What search engines and link previews are told about one programme: the page
// title and description, plus a schema.org VideoObject naming the participants.

import type { Metadata } from "next";
import type { VideoDebateDetailResponse } from "@/app/video-debates/types";

export interface VideoObjectActor {
  "@type": "Person";
  name: string;
}

export interface VideoObjectJsonLd {
  "@context": "https://schema.org";
  "@type": "VideoObject";
  name: string;
  description: string;
  uploadDate: string;
  duration: string;
  thumbnailUrl: string;
  contentUrl: string;
  embedUrl: string;
  actor: VideoObjectActor[];
  isFamilyFriendly: true;
}

/** Truncating seconds, never rounding: a 599_999 ms programme is not ten minutes. */
export function isoDuration(durationMs: number): string {
  const totalSeconds = Math.max(Math.floor(durationMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `PT${seconds}S`;
  return seconds === 0 ? `PT${minutes}M` : `PT${minutes}M${seconds}S`;
}

function description(detail: VideoDebateDetailResponse): string {
  const { debate, manifest } = detail;
  return `An editorial, unranked video debate across five domains. ${debate.winner.toUpperCase()} took it ${debate.roundScore.for}–${debate.roundScore.against}. ${manifest.final.crux}`;
}

export function videoDebateMetadata(
  detail: VideoDebateDetailResponse,
  site: string,
): Metadata {
  const { debate } = detail;
  const canonical = `/video-debates/${debate.slug}`;
  const summary = description(detail);

  return {
    title: debate.motion,
    description: summary,
    alternates: { canonical },
    openGraph: {
      type: "video.other",
      title: debate.motion,
      description: summary,
      url: `${site}${canonical}`,
      images: [debate.posterUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: debate.motion,
      description: summary,
      images: [debate.posterUrl],
    },
  };
}

export function videoDebateJsonLd(
  detail: VideoDebateDetailResponse,
  canonicalUrl: string,
): VideoObjectJsonLd {
  const { debate, manifest } = detail;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: debate.motion,
    description: manifest.final.verdict,
    uploadDate: debate.publishedAt,
    duration: isoDuration(debate.durationMs),
    thumbnailUrl: debate.posterUrl,
    // The host track carries the programme audio; the two angles are the same
    // programme from another camera, not two more videos.
    contentUrl: debate.media.host,
    embedUrl: canonicalUrl,
    actor: debate.participants.map((participant) => ({
      "@type": "Person",
      name: participant.displayName,
    })),
    isFamilyFriendly: true,
  };
}
