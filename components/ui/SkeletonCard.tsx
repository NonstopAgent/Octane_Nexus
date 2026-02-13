'use client';

import { cn } from '@/lib/utils';

type SkeletonCardProps = {
  className?: string;
  lines?: number;
  /** If true, shows a taller card with an image placeholder. */
  withImage?: boolean;
};

export default function SkeletonCard({
  className,
  lines = 3,
  withImage = false,
}: SkeletonCardProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'rounded-2xl border border-slate-800 bg-slate-900/60 p-5 animate-pulse',
        'transition duration-200',
        className
      )}
    >
      {withImage && (
        <div className="h-32 rounded-xl bg-slate-800 mb-4" />
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-4 rounded bg-slate-800',
              i === 0 && lines > 1 ? 'w-[80%]' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCardGrid({
  count = 6,
  withImage = false,
  className,
}: {
  count?: number;
  withImage?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} withImage={withImage} lines={3} />
      ))}
    </div>
  );
}
