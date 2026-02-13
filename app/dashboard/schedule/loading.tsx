import SkeletonCard from '@/components/ui/SkeletonCard';

export default function ScheduleLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-40 rounded bg-slate-800 animate-pulse" />
          <div className="mt-2 h-4 w-56 rounded bg-slate-800/80 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-lg bg-slate-800 animate-pulse" />
          <div className="h-10 w-24 rounded-lg bg-slate-800 animate-pulse" />
          <div className="h-10 w-10 rounded-lg bg-slate-800 animate-pulse" />
        </div>
      </div>
      <div className="h-96 rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  );
}
