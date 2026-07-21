import ArgumentArena from "./ArgumentArena";
import ArgumentHeader from "./ArgumentHeader";
import ArgumentInput from "./ArgumentInput";
import serverApi from "@/app/axios.server";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";
import { debateSlug } from "@/app/_utils/slugify";

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
      <section className="max-w-screen-2xl mx-auto px-6 pt-12 pb-16">
        <ArgumentHeader
          argumentHeaderData={argumentHeaderData}
          matchState={matchState}
          shareUrl={canonicalUrl}
        />
        <ArgumentArena aiAnalysis={aiAnalysis} comments={comments.data} />
      </section>
      <ArgumentInput
        argumentId={id}
        status={matchState.status}
        commentSides={(comments.data.comments ?? []).map(
          (c: { post_user_id: number; side: "for" | "against" }) => ({
            post_user_id: c.post_user_id,
            side: c.side,
          }),
        )}
      />
    </>
  );
};

export default DebateView;
