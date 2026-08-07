// One published video debate.
//
// The manifest is fetched once here and shared by generateMetadata and the render.
//
// There is deliberately no <noscript> fallback. Browsers parse <noscript> contents
// as raw text when scripting is on, so React's streaming markers inside it are never
// real nodes — and its reveal script then throws once per marker. The server-rendered
// article already carries the motion, the credits and the three <video> elements, and
// the host video ships native controls until the player hydrates.

import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import serverApi from "@/app/axios.server";
import VideoDebateExperience from "@/app/_components/video-debates/VideoDebateExperience";
import {
  videoDebateJsonLd,
  videoDebateMetadata,
} from "@/app/_components/video-debates/videoMetadata";
import VideoDebateGate from "@/app/_components/video-debates/VideoDebateGate";
import { isGateRejection, videoPassHeaders } from "@/app/video-debates/access";
import type { VideoDebateDetailResponse } from "@/app/video-debates/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type DebateResult =
  | { status: "ok"; detail: VideoDebateDetailResponse }
  | { status: "gated" }
  | { status: "missing" };

// One fetch per request, shared by generateMetadata and the page render.
const loadDebate = cache(async (slug: string): Promise<DebateResult> => {
  try {
    const { data } = await serverApi.get<VideoDebateDetailResponse>(
      `/video-debates/${encodeURIComponent(slug)}`,
      { headers: await videoPassHeaders() },
    );
    return { status: "ok", detail: data };
  } catch (error) {
    // A refused pass and a missing programme must stay distinguishable to us and
    // indistinguishable to a stranger.
    return isGateRejection(error) ? { status: "gated" } : { status: "missing" };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadDebate(slug);
  // Gated, unpublished or unknown: nothing that names the motion, and never indexed.
  if (result.status !== "ok") return { robots: { index: false, follow: false } };
  return { ...videoDebateMetadata(result.detail, SITE), robots: { index: false, follow: false } };
}

const VideoDebatePage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const result = await loadDebate(slug);
  if (result.status === "gated") return <VideoDebateGate />;
  if (result.status === "missing") notFound();
  const detail = result.detail;

  const canonicalUrl = `${SITE}/video-debates/${detail.debate.slug}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoDebateJsonLd(detail, canonicalUrl)).replace(/</g, "\\u003c"),
        }}
      />
      <VideoDebateExperience detail={detail} />
    </>
  );
};

export default VideoDebatePage;
