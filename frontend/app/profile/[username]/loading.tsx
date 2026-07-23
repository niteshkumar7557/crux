import Skeleton from "@/app/_components/ui/Skeleton";

const Loading = () => (
  <div className="max-w-7xl mx-auto px-6 py-12">
    <div className="flex items-end gap-5 md:gap-8 mb-16">
      <Skeleton className="w-32 h-32 shrink-0" />
      <div className="grow space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-2/3" />
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-outline-variant/20 mb-12">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
    <Skeleton className="h-24 w-full" />
  </div>
);

export default Loading;
