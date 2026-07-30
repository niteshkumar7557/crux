// Loading placeholder.

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse motion-reduce:animate-none bg-ink-wash ${className}`}
  />
);

export default Skeleton;
