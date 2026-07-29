import MotionArena from "./MotionArena";
import MotionHeader from "./MotionHeader";
import ArgumentInput from "./ArgumentInput";
import { ReplyProvider } from "./ReplyContext";
import serverApi from "@/app/axios.server";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";
import { debateSlug } from "@/app/_utils/slugify";
import { DEBATE_SHELL } from "./debateLayout";
import type { Analysis } from "@/app/motion/types";
import {
  atWalkoverRisk,
  emptySideLabel,
  WALKOVER_WARNING_HOURS,
} from "./walkoverRisk";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// §11: the one debate renderer shared by /motion/CRX-… and the canonical
// /debate/<slug>. Emits schema.org JSON-LD so the concluded page is a rich,
// indexable Q&A artifact (the claim as the question, the verdict as the answer).
function debateJsonLd(
  row: Record<string, unknown>,
  url: string,
): Record<string, unknown> {
  const concluded = row.status === "concluded";
  const verdict = row.verdict_text ? String(row.verdict_text) : "";
  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    url,
    mainEntity: {
      "@type": "Question",
      name: String(row.content ?? ""),
      text: String(row.content ?? ""),
      answerCount: concluded && verdict ? 1 : 0,
      ...(concluded && verdict
        ? { acceptedAnswer: { "@type": "Answer", text: verdict } }
        : {}),
    },
  };
}

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

  // Already structured by the API — see Analysis in argument/types.ts.
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

  // §7/§14 walkover risk. If a side is still empty at the deadline the debate
  // concludes unopposed and NOBODY scores — the author included. That is a rule
  // people must be able to act on while they still can, not read about in a
  // verdict.
  //
  // Only in the final hours, though: an empty side on a debate's first morning
  // is not a risk, it is a young debate. Warning then would fire on nearly
  // every new motion and teach people to scroll past the banner — so it is
  // held back until an empty side is the likely ending rather than a normal
  // early state (§7).
  const allArguments: { side: "for" | "against" }[] = argumentsRes.data.arguments ?? [];
  const forCount = allArguments.filter((c) => c.side === "for").length;
  const againstCount = allArguments.filter((c) => c.side === "against").length;
  // This is an async server component: it runs once per request, so reading the
  // clock here is a property of the response, not unstable render state. The
  // purity rule cannot tell the two apart.
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
        // Escape "<" so untrusted claim/verdict text can't break out of the
        // script tag (e.g. a motion containing "</script>"). Standard safe
        // pattern for inline JSON-LD.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(debateJsonLd(row, canonicalUrl)).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      {/* §5: one provider over the arena and the composer, so a Reply button in
          a column can arm the composer at the bottom without prop-drilling. */}
      <ReplyProvider>
        {/* Geometry shared with the composer and the route skeleton — see
            debateLayout.ts for why it lives there and not inline. */}
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
          />
        </section>
        <ArgumentInput
          motionId={id}
          status={matchState.status}
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
