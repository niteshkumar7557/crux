import { ActiveStatementsProps } from "@/app/profile/types";
import Link from "next/link";

const ActiveStatements = ({
  activeStatementsData,
}: {
  activeStatementsData: ActiveStatementsProps;
}) => {
  return (
    <div className="lg:col-span-4 bg-primary text-on-primary p-8 flex flex-col">
      <div className="mb-auto">
        <h2
          className="font-headline text-3xl font-bold mb-4 leading-tight italic"
        >
          Active Statements
        </h2>
        <ul className="space-y-6">
          {activeStatementsData.map((e, i) => (
            <li key={i} className="group cursor-pointer">
              <span className="font-label text-[10px] tracking-widest opacity-70 block mb-1">
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-on-primary animate-pulse"></span>
                  <span className="font-label text-[10px] uppercase">
                    Live in Arena #{e.id}
                  </span>
                </div>
              </span>
              <Link
                href={`/argument/CRX-${e.id}-A`}
                className="font-body font-bold text-lg group-hover:underline"
              >
                {e.title}
              </Link>
            </li>
          ))}
        </ul>
        <div className="w-full flex justify-end my-4">
          <Link
            href={"/"}
            className="font-label text-[10px] uppercase tracking-widest hover:underline"
          >
            All statements
          </Link>
        </div>
      </div>
      <button className="mt-8 cursor-pointer w-full border border-on-primary py-3 font-label text-xs uppercase tracking-[0.2em] font-bold hover:bg-on-primary hover:text-primary transition-all">
        Defend New Claim
      </button>
    </div>
  );
};

export default ActiveStatements;
