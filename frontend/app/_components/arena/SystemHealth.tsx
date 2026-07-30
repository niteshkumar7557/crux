// Sidebar: logic staked and arenas open.

import { SystemHealthData } from "@/app/types";
import SidebarSection from "./SidebarSection";

const SystemHealth = ({ data }: { data: SystemHealthData }) => {
  return (
    <SidebarSection title="Arena Status" className="mt-12">
      <dl className="grid grid-cols-2 gap-6 pt-5">
        <div>
          <dt className="font-label text-[0.58rem] uppercase tracking-[0.2em] text-ink-soft">
            Total logic staked
          </dt>
          <dd className="mt-1 display-type text-2xl tabular-nums text-ink">
            {data.logicStacked} CX
          </dd>
        </div>
        <div>
          <dt className="font-label text-[0.58rem] uppercase tracking-[0.2em] text-ink-soft">
            Active arenas
          </dt>
          <dd className="mt-1 display-type text-2xl tabular-nums text-ink">
            {data.activeArenas}
          </dd>
        </div>
      </dl>
    </SidebarSection>
  );
};

export default SystemHealth;
