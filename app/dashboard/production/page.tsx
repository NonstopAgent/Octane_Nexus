'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import KanbanBoard from '@/components/dashboard/KanbanBoard';
import { runOneHourSimulation } from './actions';
import { Loader2 } from 'lucide-react';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { LayoutGrid } from 'lucide-react';

export default function ProductionPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
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

      <KanbanBoard userId={userId} refreshTrigger={refreshTrigger} />
    </div>
  );
}
