import SkeletonCard from '@/components/ui/SkeletonCard';

export default function ProductionLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-9 w-56 rounded bg-slate-800 animate-pulse" />
          <div className="mt-2 h-4 w-72 rounded bg-slate-800/80 animate-pulse" />
        </div>
        <div className="h-12 w-44 rounded-full bg-slate-800 animate-pulse" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="w-64 flex-shrink-0 space-y-3">
            <div className="h-6 w-24 rounded bg-slate-800 animate-pulse" />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ))}
      </div>
    </div>
  );
}
