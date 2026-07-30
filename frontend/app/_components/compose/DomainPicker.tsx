// Pick a domain, or let the Arbiter choose.

import { LuListFilter, LuWandSparkles } from "react-icons/lu";
import { AUTO_DOMAIN } from "@/app/motion/new/types";

interface DomainPickerProps {
  domains: string[];
  selected: string;
  onSelect: (domain: string) => void;
  disabled: boolean;
}

const DomainPicker = ({ domains, selected, onSelect, disabled }: DomainPickerProps) => {
  return (
    <div className="space-y-3">
      <p className="font-label text-[10px] uppercase tracking-widest text-ink-soft flex items-center gap-2">
        <LuListFilter className="text-sm" />
        SELECT YOUR BATTLEGROUND
      </p>
      <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-2 md:pb-0 md:flex md:flex-wrap md:overflow-visible">
        <button
          className={`${
            selected === AUTO_DOMAIN
              ? "border-laurel bg-laurel/10 text-laurel"
              : "border-ink-faint bg-band"
          } flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 font-label text-[0.65rem] uppercase tracking-[0.16em] whitespace-nowrap transition-colors hover:border-laurel hover:text-laurel disabled:cursor-not-allowed disabled:opacity-40`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(AUTO_DOMAIN)}
        >
          <LuWandSparkles className="text-sm" />
          Auto
        </button>
        {domains.map((domainName) => (
          <button
            key={domainName}
            className={`${
              selected === domainName
                ? "border-ink bg-ink-wash text-ink"
                : "border-ink-faint bg-band"
            } cursor-pointer rounded-full border px-4 py-2 font-label text-[0.65rem] uppercase tracking-[0.16em] whitespace-nowrap transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(domainName)}
          >
            {domainName}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DomainPicker;
