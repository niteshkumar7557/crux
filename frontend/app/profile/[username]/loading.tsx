import Skeleton from "@/app/_components/ui/Skeleton";

// Stands in for the profile page, so it has to lay out where the profile page
// lays out — same shell, same blocks, same order.
//
// `w-full` is the load-bearing class here, on both this and the page it covers.
// A page root is a flex item in `main`'s column, and an auto margin on the cross
// axis (`mx-auto`) cancels `align-self: stretch`: with no definite width the
// container shrink-wraps its content instead of filling. This skeleton is a few
// short bars, so it collapsed to 336px inside a 1280px page and the whole
// profile snapped outward once the data arrived.
const Loading = () => (
  <div className="w-full max-w-7xl mx-auto px-6 py-12" aria-busy="true">
    {/* identity: eyebrow + handle, then the portrait beside the display name */}
    <Skeleton className="h-3 w-56 mb-5" />
    <div className="flex items-end gap-5 md:gap-8">
      <Skeleton className="h-32 w-32 shrink-0" />
      <Skeleton className="h-16 md:h-24 w-2/3" />
    </div>
    <Skeleton className="mt-6 h-16 w-full max-w-xl" />

    {/* career strip — four ruled figures */}
    <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-ink-faint">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>

    {/* tier ladder, season band, then the activity feed */}
    <Skeleton className="mt-12 h-24 w-full" />
    <Skeleton className="mt-12 h-40 w-full" />
    <Skeleton className="mt-12 h-64 w-full" />
  </div>
);

export default Loading;
