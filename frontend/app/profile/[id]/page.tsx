import serverApi from "@/app/axios.server";
import ActiveStatements from "../../_components/profile/ActiveStatements";
import Challenge from "../../_components/profile/Challenge";
import ReputationBreakdown from "../../_components/profile/ReputationBreakdown";
import UserHeadInfo from "../../_components/profile/UserHeadInfo";

const page = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;

  const { data } = await serverApi.get(`/profile/${id}`);

  return (
    <div className="px-8 py-6">
      <UserHeadInfo
        name={data.userHeadInfo.name}
        level={data.userHeadInfo.level}
        description={data.userHeadInfo.description}
        reputation={data.userHeadInfo.reputation}
        globalRank={data.userHeadInfo.globalRank}
      />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ReputationBreakdown data={data.reputationBreakdownData.data} />
        <ActiveStatements activeStatementsData={data.activeStatementsData} />
      </div>
      <Challenge />
    </div>
  );
};

export default page;
