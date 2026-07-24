import ArgumentArena from "./ArgumentArena";
import ArgumentHeader from "./ArgumentHeader";
import ArgumentInput from "./ArgumentInput";
import { ReplyProvider } from "./ReplyContext";
import serverApi from "@/app/axios.server";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";
import { debateSlug } from "@/app/_utils/slugify";
import {
  atWalkoverRisk,
  emptySideLabel,
  WALKOVER_WARNING_HOURS,
} from "./walkoverRisk";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// §11: the one debate renderer shared by /argument/CRX-… and the canonical
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
  let comments;
  try {
    [{ data }, comments] = await Promise.all([
      serverApi.get(`/argument/${id}`),
      serverApi.get(`/comment/${id}`),
    ]);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) notFound();
    throw error;
  }
  if (!data?.data) notFound();
  const row = data.data;

  const aiAnalysis: [string, string] = [row.for_analysis, row.against_analysis];

  const argumentHeaderData = {
    statementId: `CRX-${row.id}-A`,
    statement: `${row.content}`,
    statementKeyword: row.content_keyword,
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
  // every new statement and teach people to scroll past the banner — so it is
  // held back until an empty side is the likely ending rather than a normal
  // early state (§7).
  const allComments: { side: "for" | "against" }[] = comments.data.comments ?? [];
  const forCount = allComments.filter((c) => c.side === "for").length;
  const againstCount = allComments.filter((c) => c.side === "against").length;
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
        // script tag (e.g. a statement containing "</script>"). Standard safe
        // pattern for inline JSON-LD.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(debateJsonLd(row, canonicalUrl)).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <div className="absolute inset-0 perspective-grid -z-10 pointer-events-none"></div>
      {/* §5: one provider over the arena and the composer, so a Reply button in
          a column can arm the composer at the bottom without prop-drilling. */}
      <ReplyProvider>
        <section className="max-w-screen-2xl mx-auto px-6 pt-12 pb-16">
          <ArgumentHeader
            argumentHeaderData={argumentHeaderData}
            matchState={matchState}
            shareUrl={canonicalUrl}
            argumentId={id}
            pinned={Boolean(row.pinned)}
            isDotd={Boolean(row.is_dotd)}
          />
          {walkoverRisk && (
            <div className="mb-8 border-l-4 border-tertiary bg-surface-container-low p-5">
              <span className="font-label text-[10px] uppercase tracking-[0.2em] text-tertiary block mb-2">
                Walkover risk
              </span>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                {`Under ${WALKOVER_WARNING_HOURS} hours left and `}
                {emptySide
                  ? `nobody has argued ${emptySide}. If nobody does, this debate concludes unopposed and `
                  : "nobody has argued this debate at all. If either side is still empty at the deadline, it concludes unopposed and "}
                <span className="text-on-surface font-bold">nobody scores</span>
                {" — including the author."}
              </p>
            </div>
          )}
          <ArgumentArena
            aiAnalysis={aiAnalysis}
            comments={comments.data}
            argumentId={id}
            authorId={Number(row.user_id)}
          />
        </section>
        <ArgumentInput
          argumentId={id}
          status={matchState.status}
          authorId={Number(row.user_id)}
          commentSides={(comments.data.comments ?? []).map(
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
