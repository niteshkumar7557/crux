// The debate page: both cases, both columns, the clock, the verdict. Shared by
// /motion/[id] and /debate/[slug], so neither can drift from the other.
// Spec: game-theory.md §6, §11, §19

import MotionArena from "./MotionArena";
import MotionHeader from "./MotionHeader";
import ArgumentInput from "./ArgumentInput";
import { ReplyProvider } from "./ReplyContext";
import serverApi from "@/app/axios.server";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";
import { debateSlug } from "@/app/_utils/slugify";
import { debateJsonLd } from "./debateJsonLd";
import { DEBATE_SHELL } from "./debateLayout";
import type { Analysis } from "@/app/motion/types";
import {
  atWalkoverRisk,
  emptySideLabel,
  WALKOVER_WARNING_HOURS,
} from "./walkoverRisk";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const DebateView = async ({ id }: { id: number }) => {
  let data;
  let argumentsRes;
  try {
    [{ data }, argumentsRes] = await Promise.all([
      serverApi.get(`/motion/${id}`),
      serverApi.get(`/motion/${id}/arguments`),
    ]);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) notFound();
    throw error;
  }
  if (!data?.data) notFound();
  const row = data.data;

  const aiAnalysis: [Analysis, Analysis] = [
    row.for_analysis,
    row.against_analysis,
  ];

  const motionHeaderData = {
    motionId: `CRX-${row.id}-A`,
    motion: `${row.content}`,
    motionKeyword: row.content_keyword,
    affirmativeProbability: row.affirmative,
    negativeProbability: row.negative,
    authorUsername: row.author_username,
    authorAvatar: row.author_avatar ?? null,
  };

  const matchState = {
    status: row.status,
    closesAt: row.closes_at,
    winner: row.winner,
    margin: row.margin,
    mvpUsername: row.mvp_username,
    verdictText: row.verdict_text,
    affirmative: row.affirmative,
    negative: row.negative,
  } as const;

  const canonicalUrl = `${SITE}/debate/${debateSlug(String(row.content), Number(row.id))}`;

  const allArguments: { side: "for" | "against" }[] = argumentsRes.data.arguments ?? [];
  const forCount = allArguments.filter((c) => c.side === "for").length;
  const againstCount = allArguments.filter((c) => c.side === "against").length;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const walkoverRisk = atWalkoverRisk({
    status: row.status,
    closesAt: row.closes_at ?? null,
    forCount,
    againstCount,
    now,
  });
  const emptySide = emptySideLabel(forCount, againstCount);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            debateJsonLd({
              claim: String(row.content ?? ""),
              url: canonicalUrl,
              status: String(row.status ?? ""),
              verdictText: row.verdict_text ?? null,
              authorUsername: row.author_username ?? null,
              authorUrl: row.author_username
                ? `${SITE}/profile/${row.author_username}`
                : null,
              createdAt: row.created_at ?? null,
              argumentCount: allArguments.length,
            }),
          ).replace(/</g, "\\u003c"),
        }}
      />
      <ReplyProvider>
        <section className={DEBATE_SHELL}>
          <MotionHeader
            motionHeaderData={motionHeaderData}
            matchState={matchState}
            shareUrl={canonicalUrl}
            motionId={id}
            pinned={Boolean(row.pinned)}
            isMotd={Boolean(row.is_motd)}
          />
          {walkoverRisk && (
            <div className="mb-8 border border-side-against/40 bg-band p-5">
              <span className="font-label text-[0.62rem] uppercase tracking-[0.28em] text-side-against block mb-2">
                Walkover risk
              </span>
              <p className="font-body text-sm text-ink-soft leading-relaxed">
                {`Under ${WALKOVER_WARNING_HOURS} hours left and `}
                {emptySide
                  ? `nobody has argued ${emptySide}. If nobody does, this debate concludes unopposed and `
                  : "nobody has argued this debate at all. If either side is still empty at the deadline, it concludes unopposed and "}
                <span className="text-ink font-bold">nobody scores</span>
                {" — including the author."}
              </p>
            </div>
          )}
          <MotionArena
            aiAnalysis={aiAnalysis}
            argumentsPayload={argumentsRes.data}
            motionId={id}
            authorId={Number(row.user_id)}
            status={matchState.status}
            closesAt={matchState.closesAt}
          />
        </section>
        <ArgumentInput
          motionId={id}
          status={matchState.status}
          closesAt={matchState.closesAt}
          authorId={Number(row.user_id)}
          argumentSides={(argumentsRes.data.arguments ?? []).map(
            (c: { post_user_id: number; side: "for" | "against" }) => ({
              post_user_id: c.post_user_id,
              side: c.side,
            }),
          )}
        />
      </ReplyProvider>
    </>
  );
};

export default DebateView;
