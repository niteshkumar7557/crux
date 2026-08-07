// The video-debate skeleton. It mirrors the real stage geometry — mobile primary tile
// over a two-column context row, desktop 3×2 grid — or the page lurches when the
// programme lands. No false controls: a play button that cannot play is a lie.

import Skeleton from "@/app/_components/ui/Skeleton";

const Loading = () => (
  <div className="mx-auto max-w-5xl px-6 py-10 md:px-8" aria-busy="true">
    <Skeleton className="mb-5 h-3 w-40" />
    <Skeleton className="mb-2 h-9 w-full sm:h-11 md:h-14" />
    <Skeleton className="mb-6 h-9 w-3/4 sm:h-11 md:h-14" />
    <Skeleton className="mb-8 h-3 w-64" />

    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:grid-rows-2">
      <Skeleton className="col-span-2 order-1 aspect-video w-full md:col-start-1 md:col-end-3 md:row-start-1 md:row-end-3" />
      <Skeleton className="order-2 aspect-video w-full md:col-start-3 md:row-start-1" />
      <Skeleton className="order-3 aspect-video w-full md:col-start-3 md:row-start-2" />
    </div>

    <Skeleton className="mt-4 h-24 w-full" />
    <Skeleton className="mt-4 h-6 w-full" />
    <Skeleton className="mt-10 h-3 w-48" />
    <div className="mt-3 flex flex-wrap gap-2">
      {[0, 1, 2, 3, 4].map((pip) => (
        <Skeleton key={pip} className="h-14 w-24" />
      ))}
    </div>
  </div>
);

export default Loading;
