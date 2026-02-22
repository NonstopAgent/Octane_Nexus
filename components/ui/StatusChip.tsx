'use client';

import { cn } from '@/lib/utils';

type StatusChipVariant = 'live' | 'syncing' | 'analyzing' | 'beta' | 'draft' | 'scheduled';

const variantStyles: Record<
  StatusChipVariant,
  { className: string; label: string; ariaLabel?: string }
> = {
  live: {
    className: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_-2px_rgba(52,211,153,0.2)]',
    label: 'Live',
    ariaLabel: 'Status: live',
  },
  syncing: {
    className: 'border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_-2px_rgba(245,158,11,0.2)]',
    label: 'Syncing',
    ariaLabel: 'Status: syncing',
  },
  analyzing: {
    className: 'border-blue-500/50 bg-blue-500/10 text-blue-300 shadow-[0_0_12px_-2px_rgba(59,130,246,0.2)]',
    label: 'Analyzing',
    ariaLabel: 'Status: analyzing',
  },
  beta: {
    className: 'border-slate-500/50 bg-slate-500/10 text-slate-300 shadow-[0_0_10px_-2px_rgba(100,116,139,0.15)]',
    label: 'Beta',
    ariaLabel: 'Feature in beta',
  },
  draft: {
    className: 'border-slate-500/50 bg-slate-500/10 text-slate-400 shadow-[0_0_10px_-2px_rgba(100,116,139,0.1)]',
    label: 'Draft',
    ariaLabel: 'Status: draft',
  },
  scheduled: {
    className: 'border-amber-500/50 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_-2px_rgba(245,158,11,0.2)]',
    label: 'Scheduled',
    ariaLabel: 'Status: scheduled',
  },
};

type StatusChipProps = {
  variant: StatusChipVariant;
  /** Optional custom label (overrides variant default). */
  label?: string;
  /** If true, shows a small pulsing dot for "active" states. */
  pulse?: boolean;
  className?: string;
};

export default function StatusChip({
  variant,
  label: customLabel,
  pulse = false,
  className,
}: StatusChipProps) {
  const config = variantStyles[variant];
  const label = customLabel ?? config.label;

  return (
    <span
      role="status"
      aria-label={config.ariaLabel ?? `Status: ${label}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-amber-400/50 focus-within:ring-offset-2 focus-within:ring-offset-slate-950',
        config.className,
        className
      )}
    >
      {pulse && (
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full bg-current animate-status-pulse"
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}
