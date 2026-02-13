import SkeletonCard from '@/components/ui/SkeletonCard';

export default function MonitoringLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-48 rounded bg-slate-800 animate-pulse" />
        <div className="mt-2 h-4 w-64 rounded bg-slate-800/80 animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse" />
    </div>
  );
}
