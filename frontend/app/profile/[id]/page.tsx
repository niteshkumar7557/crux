import serverApi from "@/app/axios.server";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";
import ActiveStatements from "../../_components/profile/ActiveStatements";
import Challenge from "../../_components/profile/Challenge";
import ReputationBreakdown from "../../_components/profile/ReputationBreakdown";
import UserHeadInfo from "../../_components/profile/UserHeadInfo";

const page = async ({ params }: { params: { id: string } }) => {
  const { id: rawId } = await params;

  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let data;
  try {
    ({ data } = await serverApi.get(`/profile/${id}`));
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) notFound();
    throw error;
  }
  if (!data?.userHeadInfo) notFound();

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
