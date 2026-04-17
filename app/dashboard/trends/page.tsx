'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Eye, Send, Scissors, ExternalLink, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { buildClipStudioHandoffUrl } from '@/lib/clipStudioHandoff';

type TrendingVideo = {
  id: string;
  title: string;
  viewCount: string;
  viewCountRaw?: number;
  channelTitle: string;
  channelHandle?: string | null;
  publishedAt?: string;
  thumbnailUrl: string | null;
  youtubeUrl: string;
  whyItWorked: string;
};

function relativeDate(iso: string | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function TrendsPage() {
  const router = useRouter();
  const [niche, setNiche] = useState('content creation');
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [needsChannels, setNeedsChannels] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function handleSendToProduction(video: TrendingVideo) {
    setSendingId(video.id);
    try {
      const res = await fetch('/api/production/idea', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: video.title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to add idea');
      toast.success('Added to Idea column');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add to Production');
    } finally {
      setSendingId(null);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/trends/generate', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.niche) setNiche(data.niche);
          setNeedsChannels(Boolean(data.needsChannels));
          if (Array.isArray(data.videos)) {
            setVideos(data.videos);
          } else {
            setVideos([]);
          }
        } else {
          setVideos([]);
        }
      } catch (err) {
        console.error('Failed to load trends:', err);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Niche Surveillance"
        subtitle={`Top-performing videos from your tracked competitors in ${niche}`}
        icon={<TrendingUp className="h-5 w-5" />}
        actions={<StatusChip variant="live" pulse />}
      />

      {loading ? (
        <SkeletonCardGrid count={6} />
      ) : needsChannels ? (
        <EmptyState
          icon={Radio}
          title="Track competitor channels to see trends"
          description="Niche Surveillance pulls the top-performing videos from competitor YouTube channels you're tracking. Add a few channels on the Daily Brief page and their videos will show up here, sorted by view count."
          primaryAction={{ label: 'Add tracked channels', href: '/dashboard/brief' }}
          secondaryAction={{ label: 'Explore Library', href: '/dashboard/library' }}
        />
      ) : videos.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No videos yet"
          description="Your tracked channels haven't published anything recent that we've cached. The overnight cron will refresh this, or you can add more channels."
          primaryAction={{ label: 'Manage tracked channels', href: '/dashboard/brief' }}
          secondaryAction={{ label: 'Go to Dashboard', href: '/dashboard' }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <article
              key={video.id}
              className="dashboard-card overflow-hidden p-0 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:ring-offset-2 focus-within:ring-offset-slate-950"
            >
              {video.thumbnailUrl ? (
                <a
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-video bg-slate-900 group"
                  aria-label={`Watch ${video.title} on YouTube`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:opacity-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-slate-950/40">
                    <ExternalLink className="h-6 w-6 text-amber-300" aria-hidden />
                  </div>
                </a>
              ) : null}
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <span className="truncate font-medium text-slate-300">{video.channelTitle}</span>
                  {video.publishedAt ? <span aria-hidden>·</span> : null}
                  {video.publishedAt ? <span>{relativeDate(video.publishedAt)}</span> : null}
                </div>
                <a
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-100 mb-2 line-clamp-2 hover:text-amber-300 transition"
                >
                  {video.title}
                </a>
                <div className="mt-2 flex items-center gap-2 text-amber-400">
                  <Eye className="h-4 w-4" aria-hidden />
                  <span className="text-sm font-medium">{video.viewCount} views</span>
                </div>
                {video.whyItWorked ? (
                  <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                    <span className="font-medium text-slate-300">Why it worked:</span>{' '}
                    {video.whyItWorked}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendToProduction(video)}
                    disabled={sendingId === video.id}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition"
                  >
                    {sendingId === video.id ? <>Sending…</> : <><Send className="h-3.5 w-3.5" /> Send to Production</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(buildClipStudioHandoffUrl({
                      sourceUrl: video.youtubeUrl,
                      title: video.title,
                      platformTarget: 'tiktok',
                      returnTo: '/dashboard/trends',
                    }))}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition"
                    title="Clip It — open in Clip Studio"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    Clip It
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
