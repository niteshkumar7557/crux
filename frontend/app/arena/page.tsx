// The live feed: Motion of the Day, Main Stage, sidebar. Spec: game-theory.md §15

import { Suspense } from "react";
import type { Metadata } from "next";
import ActiveMotions from "../_components/arena/ActiveMotions";
import ArenaSidebar from "../_components/arena/ArenaSidebar";

export const metadata: Metadata = {
  title: "Arena",
  description:
    "Live debates on Crux — pick a side, argue, and watch the verdict land.",
};

const Arena = () => {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-6 py-12 md:px-10">
      <div className="flex flex-col gap-10 md:flex-row md:gap-6">
        <div className="min-w-0 md:w-[68%]">
          <Suspense fallback={null}>
            <ActiveMotions />
          </Suspense>
        </div>
        <div className="md:w-[32%] md:border-l md:border-ink-faint md:pl-2">
          <ArenaSidebar />
        </div>
      </div>
    </div>
  );
};

export default Arena;
