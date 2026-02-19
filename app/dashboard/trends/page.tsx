'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Eye, Send, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import ClipItSafetyModal from '@/components/dashboard/ClipItSafetyModal';

type TrendingVideo = {
  id: string;
  title: string;
  viewCount: string;
  whyItWorked: string;
};

const MOCK_TRENDING_VIDEOS: TrendingVideo[] = [
  {
    id: '1',
    title: 'Stop Doing Crunches — Do This Instead',
    viewCount: '1.2M',
    whyItWorked: 'Contrarian hook + quick value payoff. Viewers stayed for the "instead" reveal.',
  },
  {
    id: '2',
    title: 'The 10-Minute Dad Workout That Actually Works',
    viewCount: '890K',
    whyItWorked: 'Specific time promise + "actually works" builds trust. Low barrier to try.',
  },
  {
    id: '3',
    title: 'Why I Quit the Gym (And You Should Too)',
    viewCount: '2.1M',
    whyItWorked: 'Bold take + personal story. Sparks debate in comments = algorithm boost.',
  },
  {
    id: '4',
    title: 'POV: Your Wife Catches You Mid-Workout',
    viewCount: '756K',
    whyItWorked: 'Relatable POV format. Humor + fitness crossover = broad appeal.',
  },
  {
    id: '5',
    title: '5 Exercises Every Busy Dad Should Do',
    viewCount: '543K',
    whyItWorked: 'List format + "busy dad" niche. Clear value proposition in title.',
  },
  {
    id: '6',
    title: 'The Truth About Dad Bod',
    viewCount: '1.8M',
    whyItWorked: 'Emotional topic + reframe. "Truth" creates curiosity gap.',
  },
];

export default function TrendsPage() {
  const [niche, setNiche] = useState('content creation');
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [clipVideo, setClipVideo] = useState<TrendingVideo | null>(null);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('niche')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.niche) {
          setNiche(profile.niche);
        }
      }
      setVideos(MOCK_TRENDING_VIDEOS);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Niche Surveillance"
        subtitle={`What's working for others in: ${niche}`}
        icon={<TrendingUp className="h-5 w-5" />}
        actions={<StatusChip variant="beta" />}
      />

      {loading ? (
        <SkeletonCardGrid count={6} />
      ) : videos.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No trends yet"
          description="We're gathering what's working in your niche. Check back soon or explore the Library for ideas."
          primaryAction={{ label: 'Explore Library', href: '/dashboard/library' }}
          secondaryAction={{ label: 'Go to Dashboard', href: '/dashboard' }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <article
              key={video.id}
              className="dashboard-card p-5 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:ring-offset-2 focus-within:ring-offset-slate-950"
            >
              <h3 className="font-semibold text-slate-100 mb-2 line-clamp-2">
                {video.title}
              </h3>
              <div className="flex items-center gap-2 mb-3 text-amber-400">
                <Eye className="h-4 w-4" aria-hidden />
                <span className="text-sm font-medium">{video.viewCount} views</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="font-medium text-slate-300">Why it worked:</span>{' '}
                {video.whyItWorked}
              </p>
              <div className="mt-3 flex gap-2">
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
                  onClick={() => setClipVideo(video)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition"
                  title="Clip It — Safety check"
                >
                  <Scissors className="h-3.5 w-3.5" />
                  Clip It
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ClipItSafetyModal
        open={!!clipVideo}
        onClose={() => setClipVideo(null)}
        sourceUrl={clipVideo ? `https://trends.octane.example/#${clipVideo.id}` : ''}
        title={clipVideo?.title}
        platformTarget="tiktok"
        onSuccess={() => setClipVideo(null)}
      />
    </div>
  );
}
