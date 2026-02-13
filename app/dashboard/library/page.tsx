import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { fetchCreatorVideos } from '@/lib/youtube';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Play, Download } from 'lucide-react';
import ToolCard, { type CreatorTool } from '@/components/dashboard/ToolCard';
import ScrollableRow from '@/components/ui/ScrollableRow';
import Playbook from '@/components/dashboard/Playbook';
import LibraryClientSection from '@/components/dashboard/LibraryClientSection';
import TacticsGrid from '@/components/dashboard/TacticsGrid';
import SectionHeader from '@/components/ui/SectionHeader';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DemoNudge from '@/components/ui/DemoNudge';
import { BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?returnTo=/dashboard/library');
  }

  // 1. Get user niche from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('niche, profile_image_url')
    .eq('id', user.id)
    .single();

  const userNiche = (profile?.niche || 'content creation').toLowerCase().trim();
  const profileImageUrl = profile?.profile_image_url ?? null;

  // 2. Smart Tools: fetch all creator_tools and filter
  const { data: allTools } = await supabase
    .from('creator_tools')
    .select('*')
    .order('name');

  /** Normalize DB row to CreatorTool (tags: string[], is_trending: boolean) */
  const toCreatorTool = (row: Record<string, unknown>): CreatorTool => ({
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    description: row.description != null ? String(row.description) : null,
    url: row.url != null ? String(row.url) : null,
    icon_url: row.icon_url != null ? String(row.icon_url) : null,
    category: String(row.category ?? ''),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    is_trending: Boolean(row.is_trending),
  });

  const recommendedTools = (allTools || [])
    .filter(
      (t: Record<string, unknown>) =>
        (Array.isArray(t.tags) && (t.tags.includes(userNiche) || t.tags.includes('general')))
    )
    .map(toCreatorTool);

  const trendingTools = (allTools || [])
    .filter((t: Record<string, unknown>) => t.is_trending === true)
    .map(toCreatorTool);

  // 3. Check if user has any saved blueprints
  const { count: blueprintCount } = await supabase
    .from('saved_blueprints')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // 4. Real videos from YouTube
  const videoQuery = `how to make viral ${userNiche} videos 2026`;
  const videos = await fetchCreatorVideos(videoQuery);

  return (
    <div className="space-y-6">
      {/* Brand Identity */}
      {profileImageUrl && (
        <div className="section-frame p-6">
          <h2 className="section-title mb-4 text-amber-300/90">
            Brand Identity
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0 rounded-2xl border-2 border-amber-500/30 bg-slate-950 p-4">
              <img
                src={profileImageUrl}
                alt="Brand logo"
                className="h-24 w-24 object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-300 mb-2">
                Your brand logo from the Identity flow
              </p>
              <Link
                href={`/api/download-image?url=${encodeURIComponent(profileImageUrl)}`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 hover:border-amber-400 transition"
              >
                <Download className="h-5 w-5" />
                Download Logo
              </Link>
            </div>
          </div>
        </div>
      )}

      <DashboardPageHeader
        title="Content Library"
        subtitle={`Personalized for your niche: ${userNiche}`}
        icon={<BookOpen className="h-5 w-5" />}
        actions={<StatusChip variant="live" pulse />}
      />

      {(blueprintCount ?? 0) === 0 && recommendedTools.length === 0 && (
        <DemoNudge />
      )}

      {/* Brainstorm + Script It - Client interactive section */}
      <LibraryClientSection userNiche={userNiche} />

      {/* Viral Playbooks (Tactics Grid) */}
      <TacticsGrid niche={userNiche} />

      {/* Recommended for You */}
      {recommendedTools.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 transition duration-200 hover:border-slate-700">
          <div className="space-y-4">
            <SectionHeader
              title="Recommended for You"
              subtitle={`${userNiche} & general`}
            />
            <ScrollableRow>
              {recommendedTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </ScrollableRow>
          </div>
        </div>
      )}

      {/* Trending Now */}
      {trendingTools.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-50">
                Trending Now
              </h2>
              <span className="text-xs text-amber-400">🔥 Hot</span>
            </div>
            <ScrollableRow>
              {trendingTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </ScrollableRow>
          </div>
        </div>
      )}

      {/* Playbook */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Playbook</h2>
          <p className="text-sm text-slate-400">
            Your unified learning center for hooks, scripts, and patterns that actually work.
          </p>
        </div>
        <Playbook />
      </div>

      {/* Real Videos from YouTube */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 transition duration-200 hover:border-slate-700">
        <div className="space-y-4">
          <SectionHeader
            title="Video Inspiration"
            action={
              <a
                href="https://www.youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded"
                aria-label="View all on YouTube"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </a>
            }
          />

          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {videos.map((video) => (
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all hover:scale-[1.02]"
                >
                  <div className="relative aspect-video bg-slate-800">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                      <div className="rounded-full bg-amber-500 p-3">
                        <Play className="h-6 w-6 text-slate-950 fill-slate-950" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 group-hover:text-amber-400 transition">
                      {video.title}
                    </h3>
                    <p className="text-xs text-slate-400">{video.channelName}</p>
                  </div>
                  <ExternalLink className="absolute top-2 right-2 h-4 w-4 text-white/80 opacity-0 group-hover:opacity-100 transition" />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              No videos found. Add YOUTUBE_API_KEY to your env to enable video recommendations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
