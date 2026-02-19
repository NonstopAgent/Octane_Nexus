'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutGrid, Loader2, GripVertical, ArrowRight } from 'lucide-react';
import SystemStatusBanner from '@/components/dashboard/SystemStatusBanner';
import { POST_STATUS } from '@/lib/constants';
import { getStoredPosts, updateStoredPost, type StoredPost } from '@/lib/creatorStore';

const STATUS_ORDER = [POST_STATUS.IDEA, POST_STATUS.SCRIPTING, POST_STATUS.FILMING, POST_STATUS.READY];

export default function ProductionPage() {
  const [posts, setPosts] = useState<StoredPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    setDemoMode(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (demoMode) headers['x-demo-mode'] = 'true';
      try {
        const res = await fetch('/api/posts', { credentials: 'include', headers });
        const data = await res.json();
        if (Array.isArray(data.posts) && data.posts.length > 0) {
          setPosts(data.posts);
        } else {
          setPosts(getStoredPosts());
        }
      } catch {
        setPosts(getStoredPosts());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [demoMode]);

  async function movePost(postId: string, newStatus: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (demoMode) headers['x-demo-mode'] = 'true';
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...updated } : p)));
      } else {
        const local = updateStoredPost(postId, { status: newStatus });
        if (local) setPosts((prev) => prev.map((p) => (p.id === postId ? local : p)));
      }
    } catch {
      const local = updateStoredPost(postId, { status: newStatus });
      if (local) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? local : p)));
      }
    }
  }

  return (
    <div className="space-y-6">
      <SystemStatusBanner />
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-6 w-6 text-amber-400" />
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Production Board</h1>
          <p className="text-sm text-slate-400">Move posts across the pipeline</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_ORDER.map((status) => {
            const columnPosts = posts.filter((p) => p.status === status);
            const nextIdx = STATUS_ORDER.indexOf(status) + 1;
            const nextStatus = nextIdx < STATUS_ORDER.length ? STATUS_ORDER[nextIdx] : null;
            return (
              <div
                key={status}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 min-h-[200px]"
              >
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3 capitalize">
                  {status}
                </h3>
                <div className="space-y-2">
                  {columnPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 group"
                    >
                      <GripVertical className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {post.idea_title || 'Untitled'}
                        </p>
                      </div>
                      {nextStatus && (
                        <button
                          type="button"
                          onClick={() => movePost(post.id, nextStatus)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-amber-400 hover:bg-amber-500/20 transition"
                          title={`Move to ${nextStatus}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/trends"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20"
        >
          Send idea from Trends
        </Link>
        <Link
          href="/dashboard/post-lab"
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
        >
          Post Lab
        </Link>
      </div>
    </div>
  );
}
