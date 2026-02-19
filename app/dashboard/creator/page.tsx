'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, TrendingUp, LayoutGrid, Scissors, Calendar, BookOpen, BarChart3, Loader2, ArrowRight } from 'lucide-react';
import SystemStatusBanner from '@/components/dashboard/SystemStatusBanner';

type Pipeline = Record<string, number>;
type TopAction = { label: string; href: string; cta: string };

export default function CreatorDailyLoopPage() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [topActions, setTopActions] = useState<TopAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDemoMode =
    (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') ||
    (typeof document !== 'undefined' && document.cookie.includes('octane_demo_mode=true'));

  useEffect(() => {
    async function fetchToday() {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (isDemoMode || (typeof document !== 'undefined' && document.cookie.includes('octane_demo_mode=true'))) {
          headers['x-demo-mode'] = 'true';
        }
        const res = await fetch('/api/creator/today', { credentials: 'include', headers });
        if (!res.ok) {
          if (res.status === 401) {
            setError('Sign in or enable demo mode to view your creator pipeline.');
            return;
          }
          throw new Error('Failed to load');
        }
        const data = await res.json();
        setPipeline(data.pipeline || {});
        setTopActions(data.topActions || []);
      } catch (err) {
        setError('Could not load creator pipeline.');
      } finally {
        setLoading(false);
      }
    }
    fetchToday();
  }, [isDemoMode]);

  const hubLinks = [
    { href: '/trends', label: 'Trends', icon: TrendingUp },
    { href: '/dashboard/production', label: 'Production', icon: LayoutGrid },
    { href: '/dashboard/post-lab', label: 'Post Lab', icon: Zap },
    { href: '/dashboard/clip-studio', label: 'Clip Studio', icon: Scissors },
    { href: '/dashboard/library', label: 'Library', icon: BookOpen },
    { href: '/dashboard/schedule', label: 'Schedule', icon: Calendar },
    { href: '/dashboard/monitoring', label: 'Monitoring', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <SystemStatusBanner />

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Zap className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Creator Daily Loop</h1>
          <p className="text-sm text-slate-400">Your central hub for the content pipeline</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      ) : pipeline ? (
        <>
          {/* Pipeline counts */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-lg font-semibold text-slate-50 mb-4">Pipeline</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {['idea', 'scripting', 'filming', 'ready', 'scheduled', 'posted'].map((status) => (
                <div
                  key={status}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center"
                >
                  <p className="text-2xl font-bold text-amber-400">{pipeline[status] ?? 0}</p>
                  <p className="text-xs text-slate-400 capitalize">{status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top 3 actions */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-lg font-semibold text-slate-50 mb-4">Today&apos;s Top Actions</h2>
            <div className="space-y-3">
              {topActions.map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-amber-500/50 hover:bg-slate-900 transition"
                >
                  <span className="text-slate-200">{action.label}</span>
                  <span className="inline-flex items-center gap-1 text-sm text-amber-400 font-medium">
                    {action.cta}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
            <h2 className="text-lg font-semibold text-slate-50 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {hubLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 hover:border-amber-500/50 hover:bg-slate-900 transition"
                  >
                    <Icon className="h-5 w-5 text-amber-400" />
                    <span className="text-sm font-medium text-slate-200">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
