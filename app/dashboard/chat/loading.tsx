import SkeletonCard from '@/components/ui/SkeletonCard';

export default function ChatLoading() {
  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-slate-800 animate-pulse" />
        <div>
          <div className="h-6 w-40 rounded bg-slate-800 animate-pulse" />
          <div className="mt-1 h-4 w-56 rounded bg-slate-800/80 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 space-y-4">
        <SkeletonCard lines={2} className="max-w-md" />
        <SkeletonCard lines={3} className="max-w-md ml-auto" />
        <SkeletonCard lines={2} className="max-w-md" />
      </div>
      <div className="mt-4 h-14 rounded-xl bg-slate-800 animate-pulse" />
    </div>
  );
}
