'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

type DemoNudgeProps = {
  className?: string;
};

/**
 * Compact callout that offers one-click demo data seeding.
 * Only renders when NEXT_PUBLIC_DEMO_MODE === 'true'.
 */
export default function DemoNudge({ className }: DemoNudgeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!DEMO_MODE) return null;

  async function handleSeed() {
    setLoading(true);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to load demo data');
        return;
      }
      toast.success(`Demo data loaded (${data.count ?? 0} items)`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load demo data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`section-frame flex flex-wrap items-center gap-4 px-5 py-4 ${className ?? ''}`}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
        <Database className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">Demo data available</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Populate this page with realistic sample data so you can explore the full experience.
        </p>
      </div>
      <button
        type="button"
        data-testid="demo-load"
        onClick={handleSeed}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98]"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </>
        ) : (
          'Load Demo Data'
        )}
      </button>
    </div>
  );
}
