type SkeletonCardProps = {
  className?: string;
};

export default function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-white/10 bg-[#16161f] p-5 ${className}`}
    >
      <div className="h-3 w-24 rounded bg-white/10" />
      <div className="mt-4 h-8 w-16 rounded bg-white/10" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border border-white/5 bg-white/[0.02] px-4 py-4">
          <div className="h-4 w-40 rounded bg-white/10" />
          <div className="mt-2 h-3 w-56 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}
