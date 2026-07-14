export const dynamic = "force-dynamic";
import ActiveArguments from "./_components/arena/ActiveArguments";
import ArenaSidebar from "./_components/arena/ArenaSidebar";
import serverApi from "./axios.server";
import { MainTrendingArenaCardData, TrendingArenaCardData } from "./types";

function buildMainTrendingArenaCardData(
  mainPayload: Record<string, unknown> | null | undefined,
): MainTrendingArenaCardData {
  if (!mainPayload) return [];

  return [
    {
      username: String(mainPayload.username ?? ""),
      avatar: typeof mainPayload.avatar === "string" ? mainPayload.avatar : null,
      domain: String(mainPayload.domain ?? ""),
      title: String(mainPayload.content ?? ""),
      argumentNum: Number(mainPayload.count_comments ?? 0),
      argumentQuality: "high",
      affirmativeScore: Number(mainPayload.affirmative ?? 0),
      negativeScore: Number(mainPayload.negative ?? 0),
      argumentId: mainPayload.argumentId
        ? `CRX-${mainPayload.argumentId}-A`
        : "",
    },
  ];
}

const Home = async () => {
  let mainTrendingArenaCardData: MainTrendingArenaCardData = [];
  let trendingArenaCardData: TrendingArenaCardData = [];

  try {
    const [mainResponse, trendingResponse] = await Promise.all([
      serverApi.get("/arena/active/main"),
      serverApi.get("/arena/active/trending"),
    ]);

    mainTrendingArenaCardData = buildMainTrendingArenaCardData(
      mainResponse.data,
    );
    trendingArenaCardData = trendingResponse.data ?? [];
  } catch (error) {
    console.error("Failed to load homepage arena data:", error);
  }

  return (
    <div className="px-8 py-6 flex flex-col md:gap-10 md:flex-row">
      <div className="md:w-[70%]">
        <ActiveArguments
          mainTrendingArenaCardData={mainTrendingArenaCardData}
          trendingArenaCardData={trendingArenaCardData}
        />
      </div>
      <ArenaSidebar />
    </div>
  );
};

export default Home;
