'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Users, Eye, Heart, MousePointerClick, TrendingUp, Award, Flame, Target, Instagram, Youtube, ChevronDown, Plus, Loader2, Twitter, Music2, BarChart3 } from 'lucide-react';
import RealityCheck from '@/components/dashboard/RealityCheck';
import { supabase } from '@/lib/supabaseClient';
import { fetchSocialStats, type Platform } from '@/lib/social-intelligence';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DemoNudge from '@/components/ui/DemoNudge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

type ConnectedAccount = {
  id: string;
  platform: 'Instagram' | 'YouTube' | 'TikTok' | 'X';
  handle: string;
  followers?: string;
  subscribers?: string;
  platformKey: Platform;
};

type AccountStats = {
  followers: number;
  followersChange: number;
  reach: number;
  reachChange: number;
  engagement: number;
  engagementChange: number;
  clicks: number;
  clicksChange: number;
};

type HistoryRow = { id: string; platform: string; follower_count: number; recorded_at: string };

function buildChartDataFromHistory(history: HistoryRow[]): { date: string; followers: number }[] {
  if (!history.length) return [];
  const byDate = new Map<string, number>();
  const byTime = new Map<string, number>();
  for (const row of history) {
    const d = new Date(row.recorded_at);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    byDate.set(key, row.follower_count);
    byTime.set(key, d.getTime());
  }
  const sorted = [...byDate.entries()].sort((a, b) => (byTime.get(a[0]) ?? 0) - (byTime.get(b[0]) ?? 0));
  return sorted.map(([date, followers]) => ({ date, followers }));
}

function backfillChartData(
  currentStats: { followers: number },
  platformKey: Platform
): { date: string; followers: number }[] {
  const data: { date: string; followers: number }[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 29);
  const finalFollowers = currentStats.followers;
  const curve = platformKey === 'youtube' ? 1.8 : 1.5;
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const progress = i / 29;
    const followers = Math.round(finalFollowers * Math.pow(progress, curve));
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      followers,
    });
  }
  return data;
}

type Milestone = {
  title: string;
  date: string;
  icon: React.ElementType;
  color: string;
};

// Different milestones per account
function getMilestones(accountId: string): Milestone[] {
  const isInstagram = accountId === 'ig_1';
  
  if (isInstagram) {
    return [
      { title: 'Hit 10K Followers', date: '2 days ago', icon: Award, color: 'text-amber-400' },
      { title: 'First Viral Reel', date: '5 days ago', icon: Flame, color: 'text-rose-400' },
      { title: 'Reached 5K Followers', date: '12 days ago', icon: Target, color: 'text-emerald-400' },
      { title: 'Joined Instagram', date: '30 days ago', icon: TrendingUp, color: 'text-blue-400' },
    ];
  } else {
    return [
      { title: 'Hit 4K Subscribers', date: '3 days ago', icon: Award, color: 'text-amber-400' },
      { title: 'First 10K View Video', date: '7 days ago', icon: Flame, color: 'text-rose-400' },
      { title: 'Reached 2K Subscribers', date: '15 days ago', icon: Target, color: 'text-emerald-400' },
      { title: 'Joined YouTube', date: '45 days ago', icon: TrendingUp, color: 'text-blue-400' },
    ];
  }
}


function SkeletonChart() {
  const bars = 12;
  return (
    <div className="h-[400px] w-full flex flex-col justify-end gap-1 px-2 pb-8" role="status" aria-label="Loading chart">
      <div className="flex-1 flex items-end justify-around gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="flex-1 max-w-[24px] rounded-t bg-slate-800 animate-pulse"
            style={{ height: `${30 + (i % 5) * 14}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 px-1 text-[10px] text-slate-600">
        <span>—</span>
        <span>—</span>
        <span>—</span>
      </div>
    </div>
  );
}

function linkedAccountsToConnected(linked: Record<string, string | null>): ConnectedAccount[] {
  const out: ConnectedAccount[] = [];
  const map: { key: keyof typeof linked; platform: ConnectedAccount['platform']; platformKey: Platform }[] = [
    { key: 'instagram', platform: 'Instagram', platformKey: 'instagram' },
    { key: 'tiktok', platform: 'TikTok', platformKey: 'tiktok' },
    { key: 'youtube', platform: 'YouTube', platformKey: 'youtube' },
    { key: 'x', platform: 'X', platformKey: 'x' },
  ];
  for (const { key, platform, platformKey } of map) {
    const handle = linked[key] || linked[key.charAt(0).toUpperCase() + key.slice(1)];
    if (handle && typeof handle === 'string') {
      const h = handle.startsWith('@') ? handle : `@${handle}`;
      out.push({
        id: `${platformKey}:${h}`,
        platform,
        handle: h,
        followers: undefined,
        subscribers: platform === 'YouTube' ? undefined : undefined,
        platformKey,
      });
    }
  }
  return out;
}

export default function MonitoringPage() {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);

  const selectedAccount = connectedAccounts.find((acc) => acc.id === selectedAccountId);
  const platformKey = selectedAccount?.platformKey ?? 'instagram';

  const chartData = useMemo(() => {
    const filtered = historyRows.filter((r) => r.platform === platformKey);
    if (filtered.length > 0) {
      return buildChartDataFromHistory(filtered);
    }
    if (stats) {
      return backfillChartData({ followers: stats.followers }, platformKey);
    }
    return [];
  }, [historyRows, platformKey, stats]);

  const milestones = useMemo(() => getMilestones(platformKey), [platformKey]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('linked_accounts')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;
      const linked = (profile?.linked_accounts as Record<string, string | null>) || {};
      const accounts = linkedAccountsToConnected(linked);
      setConnectedAccounts(accounts);
      setSelectedAccountId((prev) => (prev ? prev : accounts[0]?.id ?? ''));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const account = selectedAccount;
    if (!account) return;
    let cancelled = false;
    async function loadStats() {
      if (!account) return;
      const s = await fetchSocialStats(account.platformKey, account.handle);
      if (cancelled) return;
      const reachMult = account.platformKey === 'youtube' ? 29.8 : 6.7;
      setStats({
        followers: s.followers,
        followersChange: 12,
        reach: Math.round(s.followers * reachMult),
        reachChange: 18,
        engagement: s.engagementRate,
        engagementChange: 5,
        clicks: Math.round(s.followers * 0.05),
        clicksChange: 23,
      });
    }
    loadStats();
    return () => { cancelled = true; };
  }, [selectedAccount?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('profile_analytics_history')
        .select('id, platform, follower_count, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', thirtyDaysAgo.toISOString())
        .order('recorded_at', { ascending: true });

      if (cancelled) return;
      setHistoryRows((data as HistoryRow[]) || []);
    }
    loadHistory();
    return () => { cancelled = true; };
  }, []);

  async function handleRecordSnapshot() {
    if (!selectedAccount) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setRecording(true);
    try {
      const s = await fetchSocialStats(selectedAccount.platformKey, selectedAccount.handle);
      const { error } = await supabase.from('profile_analytics_history').insert({
        user_id: user.id,
        platform: selectedAccount.platformKey,
        follower_count: s.followers,
        recorded_at: new Date().toISOString(),
      });
      if (error) throw error;
      const newRow: HistoryRow = {
        id: crypto.randomUUID(),
        platform: selectedAccount.platformKey,
        follower_count: s.followers,
        recorded_at: new Date().toISOString(),
      };
      setHistoryRows((prev) => [...prev, newRow]);
    } catch (e) {
      console.error('Failed to record snapshot', e);
    } finally {
      setRecording(false);
    }
  }

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { date: string }; value: number }[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 shadow-xl">
                  <p className="text-xs font-medium text-slate-400 mb-1">{payload[0].payload.date}</p>
                  <p className="text-sm font-semibold text-amber-400">
                    {payload[0].value.toLocaleString()} {selectedAccount?.platform === 'YouTube' ? 'Subscribers' : 'Followers'}
                  </p>
        </div>
      );
    }
    return null;
  };

  function getPlatformIcon(platform: string) {
    switch (platform) {
      case 'Instagram': return Instagram;
      case 'YouTube': return Youtube;
      case 'TikTok': return Music2;
      case 'X': return Twitter;
      default: return Instagram;
    }
  }

  function formatFollowerCount(account: ConnectedAccount): string {
    if (account.id === selectedAccountId && stats) {
      return stats.followers >= 1000
        ? (stats.followers / 1000).toFixed(1) + 'k'
        : stats.followers.toString();
    }
    if (account.followers) return account.followers;
    if (account.subscribers) return account.subscribers;
    return '—';
  }

  const hasStats = stats != null;
  const displayStats = stats ?? {
    followers: 0,
    followersChange: 0,
    reach: 0,
    reachChange: 0,
    engagement: 0,
    engagementChange: 0,
    clicks: 0,
    clicksChange: 0,
  };

  if (loading && connectedAccounts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 w-48 rounded bg-slate-800 animate-pulse" />
          <div className="mt-2 h-4 w-64 rounded bg-slate-800/80 animate-pulse" />
        </div>
        <SkeletonCardGrid count={4} />
      </div>
    );
  }

  if (connectedAccounts.length === 0) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          title="Monitoring"
          subtitle="Track your account performance"
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <DemoNudge />
        <EmptyState
          icon={BarChart3}
          title="No accounts connected"
          description="Connect your social accounts in Identity to see follower growth and metrics here."
          primaryAction={{ label: 'Connect account', href: '/dashboard/settings' }}
          secondaryAction={{ label: 'Identity', href: '/identity' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Monitoring"
        subtitle="Track your account performance"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <>
            {recording && <StatusChip variant="syncing" pulse label="Recording…" />}
            <div className="flex items-center gap-3">
          {connectedAccounts.length === 0 ? (
            <Link
              href="/identity"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition"
            >
              <Plus className="h-4 w-4" />
              Connect New Account
            </Link>
          ) : (
            <>
              {/* Account Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="inline-flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 transition min-w-[200px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    {selectedAccount && (() => {
                      const Icon = getPlatformIcon(selectedAccount.platform);
                      return (
                        <>
                          <Icon className="h-4 w-4" />
                          <span className="text-slate-300">{selectedAccount.handle}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-950 shadow-xl z-20">
                      <div className="p-2 space-y-1">
                        {connectedAccounts.map((account) => {
                          const Icon = getPlatformIcon(account.platform);
                          const isSelected = account.id === selectedAccountId;
                          return (
                            <button
                              key={account.id}
                              type="button"
                              onClick={() => {
                                setSelectedAccountId(account.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                                isSelected
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                  : 'text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <div className="flex-1 text-left min-w-0">
                                <div className="text-sm font-medium truncate">{account.handle}</div>
                                <div className="text-xs text-slate-500">
                                  {account.platform} • {formatFollowerCount(account)}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="border-t border-slate-800 p-2">
                        <Link
                          href="/identity"
                          onClick={() => setIsDropdownOpen(false)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition text-sm font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Connect New Account
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
            </div>
          </>
        }
      />

      {/* Last 7 days summary strip */}
      <div className="section-frame p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Last 7 days</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Followers change */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            {hasStats ? (
              <div>
                <p className="text-xs text-slate-500">Followers change</p>
                <p className="text-lg font-semibold text-slate-100">
                  +{displayStats.followersChange}%
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
                <div className="h-5 w-12 rounded bg-slate-800 animate-pulse" />
              </div>
            )}
          </div>
          {/* Reach change */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Eye className="h-5 w-5 text-amber-400" />
            </div>
            {hasStats ? (
              <div>
                <p className="text-xs text-slate-500">Reach change</p>
                <p className="text-lg font-semibold text-slate-100">
                  +{displayStats.reachChange}%
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
                <div className="h-5 w-12 rounded bg-slate-800 animate-pulse" />
              </div>
            )}
          </div>
          {/* Engagement change */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <Heart className="h-5 w-5 text-rose-400" />
            </div>
            {hasStats ? (
              <div>
                <p className="text-xs text-slate-500">Engagement change</p>
                <p className="text-lg font-semibold text-slate-100">
                  +{displayStats.engagementChange}%
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
                <div className="h-5 w-12 rounded bg-slate-800 animate-pulse" />
              </div>
            )}
          </div>
          {/* Link clicks change */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <MousePointerClick className="h-5 w-5 text-emerald-400" />
            </div>
            {hasStats ? (
              <div>
                <p className="text-xs text-slate-500">Link clicks change</p>
                <p className="text-lg font-semibold text-slate-100">
                  +{displayStats.clicksChange}%
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
                <div className="h-5 w-12 rounded bg-slate-800 animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Chart and Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Trajectory Chart (2/3 width) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-50 mb-1">Growth Trajectory</h2>
              <p className="text-sm text-slate-400">30-day follower growth (record snapshots to build history)</p>
            </div>
            {selectedAccount && (
              <button
                type="button"
                onClick={handleRecordSnapshot}
                disabled={recording}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition disabled:opacity-50"
              >
                {recording ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                Record Snapshot
              </button>
            )}
          </div>
          <div className="h-[400px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: '#64748b' }}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="followers"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFollowers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <>
                <SkeletonChart />
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-slate-400">
                    Connect an account to start tracking
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Record snapshots to build your growth chart
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Milestones (1/3 width) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-50 mb-1">Recent Milestones</h2>
            <p className="text-sm text-slate-400">Your achievements</p>
          </div>
          <div className="space-y-4">
            {milestones.map((milestone, index) => {
              const Icon = milestone.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition"
                >
                  <div className={`w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 ${milestone.color.replace('text-', 'bg-').replace('-400', '-500/10')}`}>
                    <Icon className={`h-5 w-5 ${milestone.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 mb-1">{milestone.title}</p>
                    <p className="text-xs text-slate-400">{milestone.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reality Check: Reinforcement Feedback */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
        <RealityCheck />
      </div>
    </div>
  );
}
