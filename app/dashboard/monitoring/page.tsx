'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Award, Flame, Target, Youtube, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import RealityCheck from '@/components/dashboard/RealityCheck';
import SystemStatusBanner from '@/components/dashboard/SystemStatusBanner';
import PostedPostsSection from '@/components/dashboard/PostedPostsSection';
import { getDisplayHandle } from '@/lib/linkedAccounts';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import Link from 'next/link';

type ConnectedAccount = {
  id: string;
  platform: 'Instagram' | 'YouTube';
  handle: string;
  connected: boolean;
};

type SummaryData = { postsThisWeek?: number; scheduled?: number; posted?: number; streak?: number };

export default function MonitoringPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    // Load real summary stats
    fetch('/api/monitoring/summary', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSummary(d))
      .catch(() => {});

    // Load real linked accounts from Supabase profile
    import('@/lib/supabaseClient').then(({ supabase }) =>
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) {
          setLoadingAccounts(false);
          return;
        }
        supabase
          .from('profiles')
          .select('linked_accounts')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            const la = profile?.linked_accounts ?? {};
            const igDisplay = getDisplayHandle(la, 'instagram');
            const ytDisplay = getDisplayHandle(la, 'youtube');
            const list: ConnectedAccount[] = [
              {
                id: 'yt_1',
                platform: 'YouTube',
                handle: ytDisplay === 'Not connected' ? '' : ytDisplay,
                connected: ytDisplay !== 'Not connected',
              },
              {
                id: 'ig_1',
                platform: 'Instagram',
                handle: igDisplay === 'Not connected' ? '' : igDisplay,
                connected: igDisplay !== 'Not connected',
              },
            ];
            setAccounts(list);
            setLoadingAccounts(false);
          });
      })
    );
  }, []);

  const ytAccount = accounts.find((a) => a.platform === 'YouTube');
  const isYouTubeConnected = ytAccount?.connected ?? false;

  function handleConnectYouTube() {
    // Redirect to YouTube OAuth start — same flow as Memory page
    window.location.href = '/api/auth/youtube/start';
  }

  function handleConnectInstagram() {
    toast.info('Instagram analytics are not yet supported. YouTube analytics are available via the Memory page.');
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Monitoring"
        subtitle="Track your posting activity and connected account status."
        icon={<TrendingUp className="h-5 w-5" />}
      />

      <SystemStatusBanner />

      {/* Summary cards from API */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs text-slate-400">Posts this week</p>
            <p className="text-2xl font-bold text-slate-50">{summary.postsThisWeek ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs text-slate-400">Scheduled</p>
            <p className="text-2xl font-bold text-slate-50">{summary.scheduled ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs text-slate-400">Posted</p>
            <p className="text-2xl font-bold text-slate-50">{summary.posted ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs text-slate-400">Streak</p>
            <p className="text-2xl font-bold text-amber-400">{summary.streak ?? 0}</p>
          </div>
        </div>
      )}

      {/* Posted posts with metrics */}
      <PostedPostsSection />

      {/* Connected accounts status */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-slate-50 mb-1">Connected accounts</h2>
        <p className="text-sm text-slate-400 mb-5">
          Connect your YouTube channel to import real performance data into your briefs and patterns.
        </p>

        {loadingAccounts ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-amber-400" />
            Loading…
          </div>
        ) : (
          <div className="space-y-3">
            {/* YouTube */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                  <Youtube className="h-5 w-5 text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">YouTube</p>
                  <p className="text-xs text-slate-500">
                    {isYouTubeConnected
                      ? `Connected as ${ytAccount?.handle}`
                      : 'Not connected — channel data unavailable'}
                  </p>
                </div>
              </div>
              {isYouTubeConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectYouTube}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Connect
                </button>
              )}
            </div>

            {/* Instagram — not yet supported */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800/50 bg-slate-900/30 px-4 py-3 opacity-60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                  <ExternalLink className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-400">Instagram</p>
                  <p className="text-xs text-slate-600">Not supported yet — YouTube only</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConnectInstagram}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-500 cursor-not-allowed"
                disabled
              >
                Coming soon
              </button>
            </div>
          </div>
        )}
      </div>

      {/* YouTube channel analytics — only show when connected */}
      {isYouTubeConnected ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Channel analytics</h2>
              <p className="text-sm text-slate-400">
                Real data from your connected YouTube channel via the Memory page.
              </p>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-amber-500/40 hover:text-amber-400"
            >
              View in Memory
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            Detailed per-video analytics, view counts, and performance patterns are available on the{' '}
            <Link href="/dashboard/settings" className="text-amber-400 hover:underline">
              Memory page
            </Link>
            . The Daily Brief surfaces the key patterns automatically every morning.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Award className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-300">Connect YouTube to unlock analytics</h3>
              <p className="mt-1 text-sm text-slate-400">
                Once you connect your YouTube channel, Octane Nexus imports your real video
                performance data — view counts, upload history, and patterns. This powers both the
                Daily Brief and the pattern analysis.
              </p>
              <button
                type="button"
                onClick={handleConnectYouTube}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                <Youtube className="h-4 w-4" />
                Connect YouTube
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestones — only shown when connected, using real data context */}
      {isYouTubeConnected && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-1">Milestones</h2>
          <p className="text-sm text-slate-400 mb-5">
            Milestone tracking will be available in a future update. For now, your performance
            patterns are surfaced in the Daily Brief every morning.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Flame, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Viral videos', value: '—' },
              { icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Outlier videos', value: '—' },
              { icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Best hook type', value: '—' },
            ].map(({ icon: Icon, color, bg, label, value }) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-bold text-slate-300">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reality Check */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
        <RealityCheck />
      </div>
    </div>
  );
}
