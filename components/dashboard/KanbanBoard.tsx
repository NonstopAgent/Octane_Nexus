'use client';

import { useState, useEffect } from 'react';
import { MoreVertical, FileText, Video, CheckCircle, LayoutGrid, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ScriptEditorModal from './ScriptEditorModal';
import ScheduleModal from './ScheduleModal';
import { POST_STATUS, type PostStatus } from '@/lib/status';
import SkeletonCard from '@/components/ui/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';
import DemoNudge from '@/components/ui/DemoNudge';

type ContentPost = {
  id: string;
  user_id: string;
  title: string;
  script_content: {
    hook?: string;
    meat?: string[];
    cta?: string;
    setup_tip?: string;
    name?: string;
  } | null;
  status: PostStatus;
  audio_url?: string | null;
  background_video_url?: string | null;
  final_video_url?: string | null;
  created_at: string;
  updated_at: string;
  version?: number;
  parent_post_id?: string | null;
};

const COLUMNS: {
  key: ContentPost['status'];
  label: string;
  icon: typeof FileText;
  subtitle?: string;
}[] = [
  { key: POST_STATUS.IDEA, label: 'Idea', icon: FileText },
  { key: POST_STATUS.SCRIPTING, label: 'Scripting', icon: FileText },
  { key: POST_STATUS.FILMING, label: 'Filming', icon: Video, subtitle: 'Background selected' },
  { key: POST_STATUS.READY, label: 'Ready', icon: CheckCircle, subtitle: 'Video ready' },
  { key: POST_STATUS.POSTED, label: 'Posted', icon: CheckCircle },
  { key: POST_STATUS.GENERATING, label: 'Generating', icon: Video },
];

type KanbanBoardProps = {
  userId: string | null;
  refreshTrigger?: number;
};

export default function KanbanBoard({ userId, refreshTrigger }: KanbanBoardProps) {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [schedulePost, setSchedulePost] = useState<ContentPost | null>(null);

  async function refreshPosts() {
    if (!userId) return;
    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) console.error('Failed to fetch posts:', error);
    setPosts((data as ContentPost[]) || []);
    if (selectedPost) {
      const updated = (data as ContentPost[])?.find((p) => p.id === selectedPost.id);
      if (updated) setSelectedPost(updated);
    }
  }

  useEffect(() => {
    if (refreshTrigger != null && userId) {
      refreshPosts();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('content_posts')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        if (error) console.error('Failed to fetch posts:', error);
        setPosts((data as ContentPost[]) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  async function movePost(postId: string, newStatus: ContentPost['status']) {
    const { error } = await supabase
      .from('content_posts')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', postId);

    if (error) {
      console.error('Failed to move post:', error);
      return;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
    );
    setOpenMenuId(null);
  }

  const getPostsByStatus = (status: ContentPost['status']) =>
    posts.filter((p) => p.status === status);

  if (!userId) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
        Sign in to view your Production Board.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} lines={2} className="min-h-[200px]" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="space-y-4">
        <DemoNudge />
        <EmptyState
          icon={LayoutGrid}
          title="No content in production yet"
          description="Create ideas in IdeaLab, then move them through scripting and filming to Ready."
          primaryAction={{ label: 'Go to Dashboard', href: '/dashboard' }}
          secondaryAction={{ label: 'Post Lab', href: '/dashboard/post-lab' }}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map(({ key, label, icon: Icon, subtitle }) => (
        <div
          key={key}
          className="rounded-xl border border-slate-800 bg-slate-950/60 min-h-[320px] flex flex-col"
          data-testid={`production-column-${key}`}
        >
          <div className="flex items-center gap-2 p-4 border-b border-slate-800">
            <Icon className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">{label}</h3>
            <span className="ml-auto text-xs text-slate-500">
              {getPostsByStatus(key).length}
            </span>
          </div>
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {getPostsByStatus(key).map((post) => (
              <div
                key={post.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPost(post)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedPost(post)}
                className="relative rounded-lg border border-slate-800 bg-slate-800/80 p-4 group cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 focus:ring-offset-slate-950"
                data-testid="production-card"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-200 line-clamp-2 pr-8 flex-1 min-w-0">
                    {post.title}
                  </p>
                  {post.version != null && (
                    <span className="text-[10px] font-medium text-slate-500 shrink-0">v{post.version}</span>
                  )}
                </div>
                {post.script_content?.name && (
                  <p className="text-xs text-slate-500 mt-1">
                    {post.script_content.name}
                  </p>
                )}
                {subtitle && post.status === key && (
                  <p className="text-[10px] text-amber-400/90 mt-1 uppercase tracking-wide">
                    {subtitle}
                  </p>
                )}
                {(post.status === POST_STATUS.READY || post.status === POST_STATUS.FILMING) && (
                  <button
                    type="button"
                    data-testid="schedule-post-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSchedulePost(post);
                    }}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20 transition"
                  >
                    <CalendarDays className="h-3 w-3" />
                    Schedule
                  </button>
                )}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId(openMenuId === post.id ? null : post.id)
                    }
                    className="absolute -top-2 -right-2 p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
                    aria-label="Move"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === post.id && (
                    <div className="absolute right-0 top-6 z-10 mt-1 w-40 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
                      {COLUMNS.filter((c) => c.key !== post.status).map(
                        ({ key: targetKey, label: targetLabel }) => (
                          <button
                            key={targetKey}
                            type="button"
                            onClick={() => movePost(post.id, targetKey)}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                          >
                            Move to {targetLabel}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <ScriptEditorModal
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        post={selectedPost}
        onUpdate={refreshPosts}
      />

      {schedulePost && (
        <ScheduleModal
          postId={schedulePost.id}
          postTitle={schedulePost.title}
          isOpen={!!schedulePost}
          onClose={() => setSchedulePost(null)}
          onScheduled={refreshPosts}
        />
      )}
    </div>
  );
}
