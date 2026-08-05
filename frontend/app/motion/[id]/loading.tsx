// The debate route skeleton. It MUST lay out at the same width as the page it stands
// in for — see debateLayout.ts, or every reload ends with content jumping sideways.

import Skeleton from "@/app/_components/ui/Skeleton";
import { DEBATE_SHELL } from "@/app/_components/motion/debateLayout";

const Loading = () => (
  <section className={DEBATE_SHELL} aria-busy="true">
    <Skeleton className="h-5 w-72 mb-6" />
    <Skeleton className="h-11.25 sm:h-15 md:h-22.5 w-full mb-2" />
    <Skeleton className="h-11.25 sm:h-15 md:h-22.5 w-3/4 mb-8" />
    {/* The split bar carries its readings above itself below sm — MotionProbability */}
    <Skeleton className="h-3 w-56 mb-2 sm:hidden" />
    <Skeleton className="h-8 sm:h-12 w-full mb-8" />
    {/* The index band, then the clash stack — mirrors MotionArena, or the page
        lurches vertically when the real content lands. */}
    <Skeleton className="h-56 w-full mb-10" />
    <div className="hidden lg:flex items-center gap-4 border-b border-ink-faint pb-3 mb-6">
      <Skeleton className="h-3 w-12" />
      <span className="grow border-t border-ink-faint" />
      <Skeleton className="h-3 w-20" />
    </div>
    {[0, 1, 2].map((row) => (
      <div
        key={row}
        className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 border-b border-ink-faint py-8"
      >
        <Skeleton className="h-32 w-full lg:col-start-1" />
        <Skeleton className="h-32 w-full mt-3 lg:mt-0 lg:col-start-2" />
      </div>
    ))}
  </section>
);

export default Loading;
