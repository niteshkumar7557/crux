// The archive skeleton. It mirrors the card grid — 16:9 poster over text bars — so
// the page does not jump when the programmes land. No fake winner, no fake domains.

import Skeleton from "@/app/_components/ui/Skeleton";

const Loading = () => (
  <div className="mx-auto max-w-6xl px-6 py-12 md:px-8" aria-busy="true">
    <Skeleton className="mb-5 h-3 w-40" />
    <Skeleton className="mb-4 h-12 w-80 md:h-16" />
    <Skeleton className="mb-14 h-4 w-full max-w-xl" />

    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((card) => (
        <div key={card} className="border border-ink-faint bg-band">
          <Skeleton className="aspect-video w-full" />
          <div className="p-6">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-3 h-5 w-full" />
            <Skeleton className="mt-2 h-5 w-2/3" />
            <Skeleton className="mt-4 h-3 w-40" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Loading;
