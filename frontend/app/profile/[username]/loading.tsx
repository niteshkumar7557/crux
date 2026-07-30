// Profile route skeleton.

import Skeleton from "@/app/_components/ui/Skeleton";

const Loading = () => (
  <div className="w-full max-w-7xl mx-auto px-6 py-12" aria-busy="true">
    <Skeleton className="h-3 w-56 mb-5" />
    <div className="flex items-end gap-5 md:gap-8">
      <Skeleton className="h-32 w-32 shrink-0" />
      <Skeleton className="h-16 md:h-24 w-2/3" />
    </div>
    <Skeleton className="mt-6 h-16 w-full max-w-xl" />

    <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-ink-faint">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>

    <Skeleton className="mt-12 h-24 w-full" />
    <Skeleton className="mt-12 h-40 w-full" />
    <Skeleton className="mt-12 h-64 w-full" />
  </div>
);

export default Loading;
