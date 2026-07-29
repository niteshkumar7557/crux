import { Suspense } from "react";
import type { Metadata } from "next";
import ActiveMotions from "../_components/arena/ActiveMotions";
import ArenaSidebar from "../_components/arena/ArenaSidebar";

export const metadata: Metadata = {
  title: "Arena",
  description:
    "Live debates on Crux — pick a side, argue, and watch the verdict land.",
};

// A rule between the feed and the sidebar rather than a gutter: this system
// separates with hairlines, and the columns otherwise drift apart at width.
const Arena = () => {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-6 py-12 md:px-10">
      <div className="flex flex-col gap-10 md:flex-row md:gap-6">
        <div className="min-w-0 md:w-[68%]">
          {/* The feed reads its tab and page from the URL, so it needs a
              boundary to be prerendered around. */}
          <Suspense fallback={null}>
            <ActiveMotions />
          </Suspense>
        </div>
        {/* The rule does the separating, so the space around it only has to
            keep the two columns from touching it — the sidebar's modules carry
            their own `px-4` inside (SidebarSection). */}
        <div className="md:w-[32%] md:border-l md:border-ink-faint md:pl-2">
          <ArenaSidebar />
        </div>
      </div>
    </div>
  );
};

export default Arena;
