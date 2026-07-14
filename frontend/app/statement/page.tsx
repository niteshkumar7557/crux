import StatementHeader from "../_components/statement/StatementHeader";
import CruxAIRoleInfo from "../_components/statement/CruxAIRoleInfo";
import { DomainClassification } from "./types";
import StatementForm from "../_components/statement/StatementForm";
import Reveal from "../_components/ui/Reveal";

const domains: DomainClassification = [
  "AI",
  "Geopolitics",
  "Technology",
  "Science",
  "Other",
];

const page = () => {
  return (
    <div className="min-h-screen pt-22 pb-20 px-4">
      <Reveal className="max-w-3xl mx-auto">
        <div data-reveal>
          <StatementHeader />
        </div>
        <div className="grid grid-cols-1 gap-8">
          <div data-reveal>
            <StatementForm domains={domains} />
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
