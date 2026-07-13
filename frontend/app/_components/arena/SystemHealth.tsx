import { SystemHealthData } from "@/app/types";

const SystemHealth = ({ data }: { data: SystemHealthData }) => {
  return (
    <div className="bg-surface-container-highest mt-10 p-6 border-t-4 border-primary">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none"></div>
        <span className="font-label text-[10px] uppercase tracking-widest text-primary">
          System Health: normal
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-label text-outline uppercase mb-1">
            Total Logic Staked
          </div>
          <div className="font-label text-lg text-on-surface">
            {data.logicStacked} CX
          </div>
        </div>
        <div>
          <div className="text-[10px] font-label text-outline uppercase mb-1">
            Active Arenas
          </div>
          <div className="font-label text-lg text-on-surface">
            {data.activeArenas}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
