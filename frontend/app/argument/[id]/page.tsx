import ArgumentArena from "@/app/_components/argument/ArgumentArena";
import ArgumentHeader from "@/app/_components/argument/ArgumentHeader";
import ArgumentInput from "@/app/_components/argument/ArgumentInput";
import serverApi from "@/app/axios.server";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id: rawId } = await params;

  const id = Number(rawId.split("-")[1]);
  if (!Number.isInteger(id) || id <= 0) notFound();

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

  const aiAnalysis: [string, string] = [
    data.data.for_analysis,
    data.data.against_analysis,
  ];

  const argumentHeaderData = {
    statementId: `CRX-${data.data.id}-A`,
    statement: `${data.data.content}`,
    statementKeyword: data.data.content_keyword,
    affirmativeProbability: data.data.affirmative,
    negativeProbability: data.data.negative,
  };

  const matchState = {
    status: data.data.status,
    closesAt: data.data.closes_at,
    winner: data.data.winner,
    margin: data.data.margin,
    mvpUsername: data.data.mvp_username,
    verdictText: data.data.verdict_text,
    affirmative: data.data.affirmative,
    negative: data.data.negative,
  } as const;

  return (
    <>
      <div className="absolute inset-0 perspective-grid -z-10 pointer-events-none"></div>
      <section className="max-w-screen-2xl mx-auto px-6 pt-12 pb-16">
        <ArgumentHeader
          argumentHeaderData={argumentHeaderData}
          matchState={matchState}
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

export default page;
