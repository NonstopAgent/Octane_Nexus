'use client';

import { useState, useMemo } from 'react';
import { Users, Eye, Heart, MousePointerClick, TrendingUp, Award, Flame, Target, Instagram, Youtube, ChevronDown, Plus } from 'lucide-react';
import RealityCheck from '@/components/dashboard/RealityCheck';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// Mock Connected Accounts
type ConnectedAccount = {
  id: string;
  platform: 'Instagram' | 'YouTube';
  handle: string;
  followers?: string;
  subscribers?: string;
};

const CONNECTED_ACCOUNTS: ConnectedAccount[] = [
  { id: 'ig_1', platform: 'Instagram', handle: '@logan.creates', followers: '12.5k' },
  { id: 'yt_1', platform: 'YouTube', handle: 'Logan Alvarez', subscribers: '4.2k' },
];

// Mock Stats Data (different for each account)
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

const STATS_DATA: Record<string, AccountStats> = {
  'ig_1': {
    followers: 12500,
    followersChange: 12,
    reach: 84320,
    reachChange: 18,
    engagement: 4.2,
    engagementChange: 5,
    clicks: 567,
    clicksChange: 23,
  },
  'yt_1': {
    followers: 4200,
    followersChange: 25,
    reach: 125000,
    reachChange: 30,
    engagement: 6.8,
    engagementChange: 8,
    clicks: 1234,
    clicksChange: 35,
  },
};

// Generate growth data for specific account (different curves)
function generateGrowthData(accountId: string) {
  const data = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 29); // 30 days ago

  // Different growth curves based on account
  const isInstagram = accountId === 'ig_1';
  const finalFollowers = isInstagram ? 12500 : 4200;
  const curve = isInstagram ? 1.5 : 1.8; // Different growth rates

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const progress = i / 29; // 0 to 1
    const followers = Math.round(finalFollowers * Math.pow(progress, curve));
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      followers,
      reach: Math.round(followers * (isInstagram ? 6.7 : 29.8)), // Instagram vs YouTube reach multiplier
      engagement: Math.round((isInstagram ? 3 + Math.random() * 2 : 5 + Math.random() * 3) * 10) / 10,
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

export default function MonitoringPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(CONNECTED_ACCOUNTS[0]?.id || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const selectedAccount = CONNECTED_ACCOUNTS.find(acc => acc.id === selectedAccountId);
  const stats = STATS_DATA[selectedAccountId] || STATS_DATA['ig_1'];
  const chartData = useMemo(() => generateGrowthData(selectedAccountId), [selectedAccountId]);
  const milestones = useMemo(() => getMilestones(selectedAccountId), [selectedAccountId]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
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
    return platform === 'Instagram' ? Instagram : Youtube;
  }

  function formatFollowerCount(account: ConnectedAccount): string {
    if (account.followers) return account.followers;
    if (account.subscribers) return account.subscribers;
    return '0';
  }

  function handleConnectAccount() {
    // Mock action - in production, this would open OAuth flow
    console.log('Connect new account clicked');
    alert('Account connection would open here. This is a mock action.');
  }

  return (
    <div className="space-y-6">
      {/* Header with Account Switcher */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Monitoring</h1>
          <p className="text-sm text-slate-400 mt-1">Track your account performance</p>
        </div>

        {/* Account Switcher */}
        <div className="flex items-center gap-3">
          {CONNECTED_ACCOUNTS.length === 0 ? (
            <button
              type="button"
              onClick={handleConnectAccount}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition"
            >
              <Plus className="h-4 w-4" />
              Connect New Account
            </button>
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
                        {CONNECTED_ACCOUNTS.map((account) => {
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
                        <button
                          type="button"
                          onClick={() => {
                            handleConnectAccount();
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition text-sm font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Connect New Account
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Row: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Followers */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 hover:border-blue-500/50 transition">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              +{stats.followersChange}%
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {selectedAccount?.platform === 'YouTube' ? 'Subscribers' : 'Total Followers'}
            </p>
            <p className="text-3xl font-bold text-slate-50">
              {selectedAccount?.platform === 'YouTube' 
                ? (stats.followers / 1000).toFixed(1) + 'k'
                : (stats.followers >= 1000 ? (stats.followers / 1000).toFixed(1) + 'k' : stats.followers.toLocaleString())
              }
            </p>
            <p className="text-xs text-slate-500">+{stats.followersChange}% this month</p>
          </div>
        </div>

        {/* Monthly Reach */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Eye className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              +{stats.reachChange}%
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {selectedAccount?.platform === 'YouTube' ? 'Total Views' : 'Monthly Reach'}
            </p>
            <p className="text-3xl font-bold text-slate-50">
              {stats.reach >= 1000 ? (stats.reach / 1000).toFixed(1) + 'k' : stats.reach.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">+{stats.reachChange}% this month</p>
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 hover:border-rose-500/50 transition">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-rose-400" />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              +{stats.engagementChange}%
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Engagement Rate</p>
            <p className="text-3xl font-bold text-slate-50">{stats.engagement}%</p>
            <p className="text-xs text-slate-500">+{stats.engagementChange}% this month</p>
          </div>
        </div>

        {/* Link Clicks */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <MousePointerClick className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              +{stats.clicksChange}%
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Link Clicks</p>
            <p className="text-3xl font-bold text-slate-50">{stats.clicks.toLocaleString()}</p>
            <p className="text-xs text-slate-500">+{stats.clicksChange}% this month</p>
          </div>
        </div>
      </div>

      {/* Middle Row: Chart and Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Trajectory Chart (2/3 width) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-50 mb-1">Growth Trajectory</h2>
            <p className="text-sm text-slate-400">30-day follower growth</p>
          </div>
          <div className="h-[400px] w-full">
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
