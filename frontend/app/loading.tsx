import Skeleton from "./_components/ui/Skeleton";

const Loading = () => (
  <div
    className="px-8 py-6 flex flex-col md:gap-10 md:flex-row"
    aria-busy="true"
  >
    <div className="md:w-[70%]">
      <div className="flex gap-6 py-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-80 w-full mb-5" />
      <div className="mb-5 md:flex md:flex-wrap md:justify-between gap-y-5">
        <Skeleton className="h-48 w-full md:w-[49%] mb-5 md:mb-0" />
        <Skeleton className="h-48 w-full md:w-[49%] mb-5 md:mb-0" />
        <Skeleton className="h-48 w-full md:w-[49%] mb-5 md:mb-0" />
        <Skeleton className="h-48 w-full md:w-[49%]" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
    <div className="py-10 md:w-[30%]">
      <Skeleton className="h-64 w-full mb-6" />
      <Skeleton className="h-72 w-full mb-6" />
      <Skeleton className="h-36 w-full" />
    </div>
  </div>
);

export default Loading;
