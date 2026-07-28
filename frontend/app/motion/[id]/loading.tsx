import Skeleton from "@/app/_components/ui/Skeleton";

const Loading = () => (
  <section className="max-w-screen-2xl mx-auto px-6 pt-12 pb-16" aria-busy="true">
    <Skeleton className="h-4 w-40 mb-8" />
    <Skeleton className="h-14 md:h-20 w-full mb-4" />
    <Skeleton className="h-14 md:h-20 w-3/4 mb-10" />
    <Skeleton className="h-5 w-full mb-16" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {["for", "against"].map((side) => (
        <div key={side}>
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-40 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      ))}
    </div>
  </section>
);

export default Loading;
