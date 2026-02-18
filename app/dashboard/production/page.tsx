'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getEffectiveUserId } from '@/lib/auth';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import { runOneHourSimulation } from './actions';
import { Loader2 } from 'lucide-react';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DemoNudge from '@/components/ui/DemoNudge';
import { LayoutGrid } from 'lucide-react';

const AUTH_RESOLVE_MS = 2000;

export default function ProductionPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const effectiveId = await getEffectiveUserId(user?.id ?? null);
      if (!cancelled) {
        setUserId(effectiveId);
        setAuthResolved(true);
      }
    })();
    const t = setTimeout(() => {
      if (!cancelled) setAuthResolved(true);
    }, AUTH_RESOLVE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleRunSimulation() {
    setSimulating(true);
    try {
      const result = await runOneHourSimulation();
      if (result.success) {
        setToast('The team just did 1 hour of work.');
        setRefreshTrigger((t) => t + 1);
      } else {
        setToast(result.error ?? 'Simulation failed.');
      }
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Production Board"
        subtitle="Manage your content from idea to posted"
        icon={<LayoutGrid className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip variant="live" pulse />
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={simulating || !userId}
              data-testid="cta-run-simulation"
              aria-label="Run one hour simulation"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md transition hover:border-amber-400 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {simulating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                '⚡'
              )}
              Run Simulation (1 Hour)
            </button>
          </div>
        }
      />

      {toast && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300"
        >
          {toast}
        </div>
      )}

      {!authResolved ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="min-h-[200px] rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse" />
          ))}
        </div>
      ) : !userId ? (
        <div className="space-y-4">
          <DemoNudge />
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
            Sign in to view your Production Board. Use the link below when demo mode is on.
          </div>
          <div className="flex justify-center">
            <a
              href="/login?returnTo=/dashboard/production"
              className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              Sign in
            </a>
          </div>
        </div>
      ) : (
        <KanbanBoard userId={userId} refreshTrigger={refreshTrigger} />
      )}
    </div>
  );
}
