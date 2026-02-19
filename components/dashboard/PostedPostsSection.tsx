'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, BarChart3, Loader2, X } from 'lucide-react';

type PostedPost = {
  id: string;
  title?: string;
  posted_url?: string;
  posted_at?: string;
  status: string;
};

type MetricsForm = {
  platform: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
};

const EMPTY_FORM: MetricsForm = { platform: 'reels', views: '', likes: '', comments: '', shares: '', saves: '' };

export default function PostedPostsSection() {
  const [posts, setPosts] = useState<PostedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PostedPost | null>(null);
  const [form, setForm] = useState<MetricsForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/posts?status=posted', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { posts: [] })
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveMetrics() {
    if (!selectedPost) return;
    setSaving(true);
    try {
      const res = await fetch('/api/metrics', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: selectedPost.id,
          platform: form.platform,
          views: form.views ? Number(form.views) : null,
          likes: form.likes ? Number(form.likes) : null,
          comments: form.comments ? Number(form.comments) : null,
          shares: form.shares ? Number(form.shares) : null,
          saves: form.saves ? Number(form.saves) : null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => { setSaved(false); setSelectedPost(null); setForm(EMPTY_FORM); }, 1500);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>;
  if (posts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-slate-50">Posted ({posts.length})</h2>
      </div>
      <div className="grid gap-2">
        {posts.slice(0, 10).map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">{p.title || 'Untitled'}</p>
              {p.posted_at && <p className="text-xs text-slate-500">{new Date(p.posted_at).toLocaleDateString()}</p>}
            </div>
            <button onClick={() => { setSelectedPost(p); setForm(EMPTY_FORM); setSaved(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition">
              <BarChart3 className="h-3.5 w-3.5" /> Enter Metrics
            </button>
          </div>
        ))}
      </div>

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-50">Metrics: {selectedPost.title}</h3>
              <button onClick={() => setSelectedPost(null)} className="text-slate-400 hover:text-slate-200"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Platform</label>
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                  <option value="reels">Reels</option>
                  <option value="tiktok">TikTok</option>
                  <option value="shorts">Shorts</option>
                  <option value="x">X</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {(['views', 'likes', 'comments', 'shares', 'saves'] as const).map((field) => (
                <div key={field}>
                  <label className="text-xs text-slate-400 capitalize">{field}</label>
                  <input type="number" min={0} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" />
                </div>
              ))}
            </div>
            <button onClick={handleSaveMetrics} disabled={saving || saved}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition">
              {saved ? <><CheckCircle className="h-4 w-4" /> Saved!</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save Metrics'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
