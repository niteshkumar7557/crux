import { LuListFilter, LuWandSparkles } from "react-icons/lu";
import { AUTO_DOMAIN } from "@/app/statement/types";

interface DomainPickerProps {
  domains: string[];
  selected: string;
  onSelect: (domain: string) => void;
  disabled: boolean;
}

const DomainPicker = ({ domains, selected, onSelect, disabled }: DomainPickerProps) => {
  return (
    <div className="space-y-3">
      <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
        <LuListFilter className="text-sm" />
        SELECT YOUR BATTLEGROUND
      </p>
      <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-2 md:pb-0 md:flex md:flex-wrap md:overflow-visible">
        <button
          className={`${
            selected === AUTO_DOMAIN
              ? "border-tertiary text-tertiary bg-tertiary/5"
              : "border-outline-variant bg-surface-container"
          } cursor-pointer border px-4 py-2 font-label text-xs uppercase whitespace-nowrap hover:border-tertiary hover:text-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2`}
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
                ? "border-primary text-primary bg-primary/5"
                : "border-outline-variant bg-surface-container"
            } cursor-pointer border px-4 py-2 font-label text-xs uppercase whitespace-nowrap hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
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
