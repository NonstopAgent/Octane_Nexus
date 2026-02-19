'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LayoutGrid, Loader2, GripVertical, ArrowRight, Plus, Sparkles } from 'lucide-react';
import SystemStatusBanner from '@/components/dashboard/SystemStatusBanner';
import { POST_STATUS } from '@/lib/postStatus';

type Post = {
  id: string;
  title?: string;
  idea_title?: string;
  status: string;
  caption?: string | null;
  final_video_url?: string | null;
};

const STATUS_ORDER = [POST_STATUS.IDEA, POST_STATUS.SCRIPTING, POST_STATUS.FILMING, POST_STATUS.READY];
const STATUS_LABELS: Record<string, string> = {
  idea: 'Ideas',
  scripting: 'Scripting',
  filming: 'Filming',
  ready: 'Ready',
};

export default function ProductionPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/posts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : data.posts ?? []);
      } else {
        const fallback = await fetch('/api/posts', { credentials: 'include' });
        const fb = await fallback.json();
        setPosts(fb.posts ?? []);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function movePost(postId: string, newStatus: string) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p)));
    try {
      const res = await fetch(`/api/production/posts/${postId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        await fetch(`/api/posts/${postId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      }
    } catch {
      // optimistic update already applied
    }
  }

  const postLabel = (p: Post) => p.title || p.idea_title || 'Untitled';

  return (
    <div className="space-y-6">
      <SystemStatusBanner />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Production Board</h1>
            <p className="text-sm text-slate-400">Move posts across the pipeline</p>
          </div>
        </div>
        <Link
          href="/dashboard/trends"
          className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
        >
          <Plus className="h-4 w-4" />
          New Idea from Trends
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 py-20 gap-4">
          <Sparkles className="h-12 w-12 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300">No posts yet</h3>
          <p className="text-sm text-slate-500 max-w-sm text-center">Head to Trends and send your first idea to production.</p>
          <Link
            href="/dashboard/trends"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20"
          >
            Go to Trends
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_ORDER.map((status) => {
            const columnPosts = posts.filter((p) => p.status === status);
            const nextIdx = STATUS_ORDER.indexOf(status) + 1;
            const nextStatus = nextIdx < STATUS_ORDER.length ? STATUS_ORDER[nextIdx] : null;
            return (
              <div key={status} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 min-h-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                    {STATUS_LABELS[status] || status}
                  </h3>
                  <span className="text-xs text-slate-500">{columnPosts.length}</span>
                </div>
                <div className="space-y-2">
                  {columnPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 group hover:border-amber-500/30 transition"
                    >
                      <GripVertical className="h-4 w-4 text-slate-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{postLabel(post)}</p>
                        {post.caption && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{post.caption}</p>
                        )}
                      </div>
                      {nextStatus && (
                        <button
                          type="button"
                          onClick={() => movePost(post.id, nextStatus)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/20 transition"
                          title={`Move to ${nextStatus}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {columnPosts.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4">No posts</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/dashboard/post-lab"
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Open Post Lab
        </Link>
        <Link
          href="/dashboard/clip-studio"
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Clip Studio
        </Link>
      </div>
    </div>
  );
}
