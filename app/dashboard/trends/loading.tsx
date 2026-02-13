import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';

export default function TrendsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-slate-800 animate-pulse" />
        <div>
          <div className="h-8 w-56 rounded bg-slate-800 animate-pulse" />
          <div className="mt-2 h-4 w-40 rounded bg-slate-800/80 animate-pulse" />
        </div>
      </div>
      <SkeletonCardGrid count={6} />
    </div>
  );
}
