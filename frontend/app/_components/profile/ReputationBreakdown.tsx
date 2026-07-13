import { ReputationBreakdownProps } from "@/app/profile/types";

const ReputationBreakdown = ({ data }: ReputationBreakdownProps) => {
  const max = Math.max(...data);
  const maxIndex = data.indexOf(max);

  return (
    <div className="lg:col-span-8 bg-surface-container py-8 px-5 relative overflow-hidden">
      <div className="flex justify-between items-start mb-12">
        <div>
          <h2
            className="font-headline text-3xl font-bold mb-1 italic"
          >
            Reputation Breakdown
          </h2>
          <span className="font-label text-[10px] text-outline uppercase tracking-widest">
            Argument Quality Over Time
          </span>
        </div>
      </div>
      {/* <!-- Custom Mock Data Viz --> */}
      <div className="h-64 flex items-end gap-1 relative">
        {/* <!-- Grid Lines --> */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
          <div className="border-t border-on-surface"></div>
          <div className="border-t border-on-surface"></div>
          <div className="border-t border-on-surface"></div>
          <div className="border-t border-on-surface"></div>
        </div>
        {/* <!-- Bars (Representing data points) --> */}

        {data.map((e, i) =>
          i === maxIndex ? (
            <div
              key={i}
              className="flex-1 bg-primary relative"
              style={{ height: `${e}%` }}
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface-bright p-2 text-[10px] font-label whitespace-nowrap z-10">
                PEAK PERFORMANCE
              </div>
            </div>
          ) : (
            <div
              key={i}
              className="flex-1 bg-surface-container-high hover:bg-primary transition-colors cursor-crosshair"
              style={{ height: `${e}%` }}
            ></div>
          ),
        )}
      </div>
    </div>
  );
};

export default ReputationBreakdown;
