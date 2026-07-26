'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CheckCircle2, Circle, BarChart3, Loader2 } from 'lucide-react';

/**
 * Performance chart + goal checklist.
 *
 * This replaces the chart deleted in commit 26ea93e7. That one plotted a
 * hardcoded STATS_DATA constant — 12,500 followers, 84,320 reach — with no
 * connection to any real account, which is why it was removed. Everything
 * here comes from /api/performance, which reads the creator's actual
 * imported videos and derives each goal from database state.
 *
 * If there is no data, this says so rather than drawing a flattering line.
 */

type PerfPoint = { date: string; views: number; title: string };

type Goal = {
  id: string;
  label: string;
  done: boolean;
  hint: string;
  href: string;
};

type PerfResponse = {
  series: PerfPoint[];
  summary: {
    videoCount: number;
    totalViews: number;
    avgViews: number;
    bestTitle: string | null;
    bestViews: number;
    briefCount: number;
  };
  goals: Goal[];
  goalsCompleted: number;
  goalsTotal: number;
};

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export default function PerformanceChart() {
  const [data, setData] = useState<PerfResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/performance', { credentials: 'include' });
        if (res.ok) setData(await res.json());
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-card flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading performance…
      </div>
    );
  }

  if (!data) return null;

  const { series, summary, goals, goalsCompleted, goalsTotal } = data;
  const hasSeries = series.length >= 2;
  const progressPct = goalsTotal > 0 ? (goalsCompleted / goalsTotal) * 100 : 0;

  return (
    <section className="dashboard-card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <BarChart3 className="h-5 w-5 text-amber-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Your performance</h2>
            <p className="text-xs text-slate-500">
              {hasSeries
                ? `${summary.videoCount} videos · ${compact(summary.totalViews)} total views`
                : 'Views across your imported videos'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Setup</p>
          <p className="text-sm font-semibold text-amber-300">
            {goalsCompleted}/{goalsTotal} done
          </p>
        </div>
      </div>

      {hasSeries ? (
        <>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={compact}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#cbd5e1' }}
                  // recharts types the formatter value as possibly undefined
                  formatter={(value?: number) => [`${(value ?? 0).toLocaleString()} views`, '']}
                  labelFormatter={(label: string, payload) => {
                    const t = payload?.[0]?.payload?.title;
                    return t ? `${label} — ${t}` : label;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#viewsFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
              <p className="text-xs text-slate-500">Average views</p>
              <p className="text-lg font-semibold text-slate-100">{compact(summary.avgViews)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
              <p className="text-xs text-slate-500">Best video</p>
              <p className="truncate text-sm font-medium text-slate-200" title={summary.bestTitle || ''}>
                {summary.bestTitle || '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
              <p className="text-xs text-slate-500">Briefs generated</p>
              <p className="text-lg font-semibold text-slate-100">{summary.briefCount}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-8 text-center">
          <p className="text-sm text-slate-400">No video data yet.</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            This chart plots views across the videos on your connected channel.
            It stays empty until an import brings some in — we won&apos;t draw a
            line from numbers you don&apos;t have.
          </p>
        </div>
      )}

      {/* Goals. Every one is computed from real state, so a tick genuinely
          means the thing happened. */}
      <div className="mt-6">
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <ul className="space-y-2">
          {goals.map((g) => (
            <li key={g.id}>
              <Link
                href={g.href}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 transition hover:border-amber-500/40"
              >
                {g.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
                )}
                <span
                  className={`text-sm ${g.done ? 'text-slate-400 line-through' : 'text-slate-200'}`}
                >
                  {g.label}
                </span>
                <span className="ml-auto truncate text-xs text-slate-500">{g.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
