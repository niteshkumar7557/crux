const Skeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse motion-reduce:animate-none bg-surface-container-high ${className}`}
  />
);

export default Skeleton;
