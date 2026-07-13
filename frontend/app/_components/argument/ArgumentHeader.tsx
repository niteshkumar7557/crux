import { ArgumentHeaderProps } from "@/app/argument/types";
import ArgumentProbability from "./ArgumentProbability";

const ArgumentHeader = ({
  argumentHeaderData,
}: {
  argumentHeaderData: ArgumentHeaderProps;
}) => {
  return (
    <div>
      <div className="flex flex-col items-start gap-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-primary px-2 py-0.5 border border-primary/30">
            Live Arena
          </span>
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-outline">
            ID: {argumentHeaderData.statementId}
          </span>
        </div>
        <h1
          className="font-headline text-5xl md:text-7xl font-bold max-w-5xl tracking-tight break-words"
        >
          {
            argumentHeaderData.statement.split(
              argumentHeaderData.statementKeyword,
            )[0]
          }
          <span className="text-primary italic">
            {argumentHeaderData.statementKeyword}
          </span>
          {
            argumentHeaderData.statement.split(
              argumentHeaderData.statementKeyword,
            )[1]
          }
        </h1>
      </div>

      <ArgumentProbability argumentHeaderData={argumentHeaderData} />
    </div>
  );
};

export default ArgumentHeader;
