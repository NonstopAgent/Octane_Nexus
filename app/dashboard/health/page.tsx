'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

type ServiceStatus = { ok: boolean; error?: string };

type HealthResults = {
  gemini?: ServiceStatus;
  database?: ServiceStatus;
  storage?: ServiceStatus;
};

const SERVICES: { key: keyof HealthResults; label: string }[] = [
  { key: 'gemini', label: 'Gemini API' },
  { key: 'database', label: 'Database' },
  { key: 'storage', label: 'Storage' },
];

function StatusCard({
  label,
  status,
}: {
  label: string;
  status: ServiceStatus | undefined;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const ok = status?.ok ?? false;
  const error = status?.error;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-200">{label}</span>
        {status === undefined ? (
          <span className="text-slate-500 text-sm">—</span>
        ) : ok ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span>✅ OK</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-rose-400">
            <XCircle className="h-5 w-5" />
            <span>❌ Failed</span>
          </span>
        )}
      </div>
      {error && (
        <div className="border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition"
          >
            {detailsOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {detailsOpen ? 'Hide' : 'Show'} raw error
          </button>
          {detailsOpen && (
            <pre className="mt-3 p-4 rounded-lg bg-slate-900/80 text-xs text-rose-300/90 overflow-x-auto whitespace-pre-wrap border border-slate-800">
              {error}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthResults | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSystemCheck() {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch('/api/health-check');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData({
        gemini: { ok: false, error: err instanceof Error ? err.message : String(err) },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">System Status</h1>
          <p className="text-sm text-slate-400 mt-1">
            Test all external connections at a glance
          </p>
        </div>
        <button
          type="button"
          onClick={runSystemCheck}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Running...
            </>
          ) : (
            'Run System Check'
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SERVICES.map(({ key, label }) => (
          <StatusCard key={key} label={label} status={data?.[key]} />
        ))}
      </div>

      {data && !loading && (
        <p className="text-xs text-slate-500">
          Last run: {new Date().toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
