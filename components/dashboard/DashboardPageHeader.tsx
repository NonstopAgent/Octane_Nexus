'use client';

import { cn } from '@/lib/utils';

type DashboardPageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional icon or visual element (e.g. <TrendingUp className="...">) */
  icon?: React.ReactNode;
  /** Right-side actions: chips, buttons */
  actions?: React.ReactNode;
  className?: string;
};

export default function DashboardPageHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header className={cn('pb-5 mb-6 border-b border-slate-800/80', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="flex-shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
