import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';

export default function LibraryLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-64 rounded bg-slate-800 animate-pulse" />
        <div className="mt-2 h-4 w-48 rounded bg-slate-800/80 animate-pulse" />
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="h-6 w-40 rounded bg-slate-800 animate-pulse mb-4" />
        <div className="h-24 w-24 rounded-2xl bg-slate-800 animate-pulse" />
      </div>
      <SkeletonCardGrid count={6} withImage />
    </div>
  );
}
