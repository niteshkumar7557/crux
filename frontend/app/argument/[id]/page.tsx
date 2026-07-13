import ArgumentArena from "@/app/_components/argument/ArgumentArena";
import ArgumentHeader from "@/app/_components/argument/ArgumentHeader";
import ArgumentInput from "@/app/_components/argument/ArgumentInput";
import serverApi from "@/app/axios.server";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  let { id } = await params;

  id = id.split("-")[1];

  const { data } = await serverApi.get(`/argument/${+id}`);
  const comments = await serverApi.get(`/comment/${+id}`);

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

  return (
    <>
      <div className="absolute inset-0 perspective-grid -z-10 pointer-events-none"></div>
      <section className="max-w-screen-2xl mx-auto px-6 pt-12 pb-16">
        <ArgumentHeader argumentHeaderData={argumentHeaderData} />
        <ArgumentArena aiAnalysis={aiAnalysis} comments={comments.data} />
      </section>
      <ArgumentInput argumentId={+id} />
    </>
  );
};

export default page;
