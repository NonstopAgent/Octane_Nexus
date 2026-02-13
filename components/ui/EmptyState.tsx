'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href: string };
  className?: string;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        'section-frame flex flex-col items-center justify-center px-8 py-16 text-center',
        className
      )}
    >
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_-4px_rgba(245,158,11,0.15)]"
        aria-hidden
      >
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">{description}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {primaryAction && (
          primaryAction.href ? (
            <Link
              href={primaryAction.href}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98]"
            >
              {primaryAction.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98]"
            >
              {primaryAction.label}
            </button>
          )
        )}
        {secondaryAction && (
          <Link
            href={secondaryAction.href}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-600 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            {secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}
