export const dynamic = "force-dynamic";
import ComposeHeader from "@/app/_components/compose/ComposeHeader";
import CruxAIRoleInfo from "@/app/_components/compose/CruxAIRoleInfo";
import { DomainClassification } from "./types";
import MotionForm from "@/app/_components/compose/MotionForm";
import Reveal from "@/app/_components/ui/Reveal";
import serverApi from "@/app/axios.server";

const page = async () => {
  let domains: DomainClassification = [];
  try {
    const { data } = await serverApi.get("/domains");
    domains = data.domains.map((d: { id: number; name: string }) => d.name);
  } catch {
    domains = [];
  }

  return (
    <div className="min-h-screen pt-22 pb-20 px-4">
      <Reveal className="max-w-3xl mx-auto">
        <div data-reveal>
          <ComposeHeader />
        </div>
        <div className="grid grid-cols-1 gap-8">
          <div data-reveal>
            <MotionForm domains={domains} />
          </div>
          <div data-reveal>
            <CruxAIRoleInfo />
          </div>
        </div>
      </Reveal>
    </div>
  );
};

export default page;
