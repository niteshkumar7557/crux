// The programme archive — every published video debate, newest first.

export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import serverApi from "@/app/axios.server";
import Pagination from "@/app/_components/ui/Pagination";
import VideoDebateCard from "@/app/_components/video-debates/VideoDebateCard";
import VideoDebateGate from "@/app/_components/video-debates/VideoDebateGate";
import type { VideoDebateListResponse } from "./types";
import { parseArchivePage, videoDebateArchiveHref } from "./archiveHref";
import { isGateRejection, videoPassHeaders } from "./access";

type SearchParams = Promise<{ page?: string }>;

const EMPTY: VideoDebateListResponse = { debates: [], total: 0, page: 1, pageSize: 12 };

type ArchiveResult =
  | { status: "ok"; data: VideoDebateListResponse }
  | { status: "gated" }
  | { status: "error" };

async function fetchProgrammes(page: number): Promise<ArchiveResult> {
  try {
    const { data } = await serverApi.get<VideoDebateListResponse>("/video-debates", {
      params: { page, pageSize: 12 },
      headers: await videoPassHeaders(),
    });
    return Array.isArray(data.debates) ? { status: "ok", data } : { status: "error" };
  } catch (error) {
    // A refused pass is not a failure to report — it is the gate doing its job.
    if (isGateRejection(error)) return { status: "gated" };
    console.error("Failed to load the video debate archive:", error);
    return { status: "error" };
  }
}

// The archive is unlisted while the feature is shown privately, so it is noindex
// unconditionally — a leaked link must never reach an index.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { page: pageParam } = await searchParams;
  const result = await fetchProgrammes(parseArchivePage(pageParam));
  if (result.status !== "ok") {
    return { title: "Video debates", robots: { index: false, follow: false } };
  }
  return {
    title: "Video debates",
    description:
      "Crux video debates — five domains, ten judged turns, one editorial programme. Unranked and separate from the Arena record.",
    alternates: { canonical: videoDebateArchiveHref(result.data.page) },
    robots: { index: false, follow: false },
  };
}

const VideoDebateArchivePage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { page: pageParam } = await searchParams;
  const outcome = await fetchProgrammes(parseArchivePage(pageParam));
  if (outcome.status === "gated") return <VideoDebateGate />;
  const result = outcome.status === "ok" ? outcome.data : EMPTY;
  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-8">
      <div className="mb-14">
        <p className="flex items-center gap-3 font-label text-[0.62rem] uppercase tracking-[0.3em] text-ink-soft">
          <span aria-hidden className="h-px w-8 bg-ink-faint" />
          Editorial · Unranked
        </p>
        <h1 className="mt-5 display-type text-[clamp(2.4rem,6vw,4.2rem)] text-ink">
          Video debates
        </h1>
        <p className="mt-4 max-w-xl font-body text-lg text-ink-soft">
          Five domains, ten judged turns and one verdict, filmed and judged as a programme. These
          are separate from the Arena: they carry no logic score, no record and no leaderboard
          position.
        </p>
      </div>

      {result.debates.length === 0 ? (
        <div className="border border-ink-faint bg-band p-12 text-center">
          <p className="mb-3 font-headline text-2xl italic text-ink">
            No programme has been published yet.
          </p>
          <p className="font-body text-sm text-ink-soft">
            Video debates are produced by hand and published a few at a time. The Arena is running
            as usual in the meantime.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.debates.map((debate) => (
              <VideoDebateCard key={debate.slug} debate={debate} />
            ))}
          </div>
          <Pagination
            page={result.page}
            totalPages={totalPages}
            totalItems={result.total}
            itemLabel={result.total === 1 ? "programme" : "programmes"}
            hrefFor={(page) => videoDebateArchiveHref(page)}
          />
        </>
      )}
    </div>
  );
};

export default VideoDebateArchivePage;
