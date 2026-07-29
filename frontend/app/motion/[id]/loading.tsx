import Skeleton from "@/app/_components/ui/Skeleton";
import { DEBATE_SHELL } from "@/app/_components/motion/debateLayout";

// The route skeleton stands in for DebateView while the motion and its
// arguments are fetched, so it has to lay out where DebateView lays out —
// same shell, same two columns, same centre gap. It shared none of that before
// and rendered 464px wide inside a 1440px page, which is why every reload of a
// debate ended with the whole arena snapping sideways once the data landed.
//
// Block heights are matched to the real thing rather than eyeballed: the meta
// row, two headline lines at the h1's own leading, and the probability bar.
const Loading = () => (
  <section className={DEBATE_SHELL} aria-busy="true">
    <Skeleton className="h-5 w-72 mb-6" />
    <Skeleton className="h-14 md:h-[4.7rem] w-full mb-2" />
    <Skeleton className="h-14 md:h-[4.7rem] w-3/4 mb-8" />
    <Skeleton className="h-12 w-full mb-8" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-px">
      {(["for", "against"] as const).map((side) => (
        <div
          key={side}
          className={
            side === "for"
              ? "lg:pr-7 py-8"
              : "lg:pl-7 py-8 border-t lg:border-t-0 lg:border-l border-ink-faint"
          }
        >
          <div className="mb-10 flex items-center justify-between border-b border-ink-faint pb-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-52 w-full mb-6" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default Loading;
