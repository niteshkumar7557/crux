import Skeleton from "@/app/_components/ui/Skeleton";

const Loading = () => (
  <div className="px-8 py-6" aria-busy="true">
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 md:mt-12 mb-16 items-end">
      <div className="lg:col-span-7">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-16 md:h-24 w-3/4 mb-6" />
        <Skeleton className="h-5 w-full max-w-xl mb-2" />
        <Skeleton className="h-5 w-2/3 max-w-xl" />
      </div>
      <div className="lg:col-span-5 grid grid-cols-2 gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </section>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <Skeleton className="h-80 lg:col-span-8" />
      <Skeleton className="h-80 lg:col-span-4" />
    </div>
    <Skeleton className="h-48 w-full mt-6" />
  </div>
);

export default Loading;
