'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Lightbulb, ExternalLink, Radio, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';

/**
 * Trends
 * ======
 * Shows topics that MULTIPLE tracked channels covered in the same short
 * window — not a view-count leaderboard.
 *
 * The previous version listed the top 8 competitor videos by raw views. It
 * showed the same evergreen uploads every day, and offered "Clip It" on other
 * creators' videos, which quietly suggested re-uploading someone else's
 * content. Both are gone.
 *
 * Actions here operate on the TOPIC, not on the competitor's video, because
 * the thing a creator can legitimately use is the angle.
 */

type TrendVideo = {
  id: string;
  title: string;
  channelTitle: string;
  viewCount: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  youtubeUrl: string;
};

type Trend = {
  topic: string;
  channels: string[];
  channelCount: number;
  windowDays: number;
  totalViews: number;
  whyItMatters: string;
  videos: TrendVideo[];
};

type TrendsResponse = {
  niche: string;
  trends: Trend[];
  needsChannels?: boolean;
  needsRefresh?: boolean;
  staleData?: boolean;
  windowDays?: number;
  channelsTracked?: number;
  videosConsidered?: number;
  freshVideos?: number;
  lastSyncedAt?: string | null;
};

function relativeDate(iso: string | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function TrendsPage() {
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingTopic, setClaimingTopic] = useState<string | null>(null);

  async function handleUseAngle(trend: Trend) {
    setClaimingTopic(trend.topic);
    try {
      // Deliberately seeded from the TOPIC, not a competitor's video title.
      // Copying their title into the creator's pipeline is how you end up
      // making a worse version of a video that already exists.
      const res = await fetch('/api/production/idea', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${trend.topic} — my angle`,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error || 'Failed to add idea');
      toast.success(`"${trend.topic}" added to your ideas`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add the idea');
    } finally {
      setClaimingTopic(null);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/trends/generate', { credentials: 'include' });
        if (res.ok) {
          setData(await res.json());
        } else {
          setData(null);
        }
      } catch (err) {
        console.error('Failed to load trends:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const niche = data?.niche || 'your niche';
  const trends = data?.trends || [];

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Trends"
        subtitle={`Topics multiple channels in ${niche} covered at the same time`}
        icon={<TrendingUp className="h-5 w-5" />}
        actions={<StatusChip variant="live" pulse />}
      />

      {loading ? (
        <SkeletonCardGrid count={3} />
      ) : data?.needsChannels ? (
        <EmptyState
          icon={Radio}
          title="Track at least two channels to see trends"
          description="A trend is several creators covering the same thing at once. With one channel there's nothing to compare against — add two or three competitors on the Daily Brief page and this fills in."
          primaryAction={{ label: 'Add tracked channels', href: '/dashboard/brief' }}
        />
      ) : data?.needsRefresh ? (
        <EmptyState
          icon={RefreshCw}
          title="No competitor videos cached yet"
          description="Your channels are tracked but we haven't pulled their uploads yet. The overnight job does this automatically — check back tomorrow morning."
          primaryAction={{ label: 'Manage tracked channels', href: '/dashboard/brief' }}
        />
      ) : data?.staleData ? (
        <EmptyState
          icon={Clock}
          title="Your competitor data is out of date"
          description={`Everything cached for your ${data.channelsTracked ?? 0} channel(s) is older than ${data.windowDays ?? 14} days, so there's nothing recent enough to compare. The overnight job refreshes this automatically.`}
          primaryAction={{ label: 'Manage tracked channels', href: '/dashboard/brief' }}
        />
      ) : trends.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nothing converging right now"
          description={`We checked ${data?.freshVideos ?? 0} recent video(s) across ${data?.channelsTracked ?? 0} channel(s) and found no topic that more than one of them covered. That's a real answer, not an error — tracking more channels makes overlap easier to spot.`}
          primaryAction={{ label: 'Track more channels', href: '/dashboard/brief' }}
        />
      ) : (
        <div className="space-y-5">
          {trends.map((trend) => (
            <article key={trend.topic} className="dashboard-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">{trend.topic}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5 font-medium text-amber-300">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {trend.channelCount} channels
                    </span>
                    <span aria-hidden>·</span>
                    <span>within {trend.windowDays}d</span>
                    <span aria-hidden>·</span>
                    <span>{trend.channels.join(', ')}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUseAngle(trend)}
                  disabled={claimingTopic === trend.topic}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {claimingTopic === trend.topic ? (
                    'Adding…'
                  ) : (
                    <>
                      <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                      Use this angle
                    </>
                  )}
                </button>
              </div>

              {trend.whyItMatters ? (
                <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm leading-relaxed text-slate-300">
                  {trend.whyItMatters}
                </p>
              ) : null}

              <div className="mt-4 space-y-2">
                {trend.videos.map((v) => (
                  <a
                    key={v.id}
                    href={v.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 transition hover:border-amber-500/40 hover:bg-slate-900"
                  >
                    {v.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        className="h-12 w-20 shrink-0 rounded object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200 group-hover:text-amber-300">
                        {v.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {v.channelTitle} · {v.viewCount} views · {relativeDate(v.publishedAt)}
                      </p>
                    </div>
                    <ExternalLink
                      className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-amber-300"
                      aria-hidden
                    />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
