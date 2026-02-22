'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Copy, Video, X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getEffectiveUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import SectionHeader from '@/components/ui/SectionHeader';
import BrainScorecardModal, { type BrainEvalResult } from '@/components/dashboard/BrainScorecardModal';
import { getPlayableVideoUrl } from '@/lib/playableUrl';
import BRollPanel from '@/components/dashboard/BRollPanel';

const AUTH_RESOLVE_MS = 2000;

type ReadyPost = {
  id: string;
  title: string | null;
  script_content: { hook?: string; meat?: string[]; cta?: string } | null;
  caption: string | null;
  hashtags: string[] | null;
  final_video_url: string | null;
  background_video_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-slate-50 disabled:opacity-50 transition"
    >
      {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export default function LibraryReadySection() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [posts, setPosts] = useState<ReadyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReadyPost | null>(null);
  const [brainEval, setBrainEval] = useState<BrainEvalResult | null>(null);
  const [brainModalOpen, setBrainModalOpen] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const fetchReady = useCallback(async () => {
    const res = await fetch('/api/library/ready', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json().catch(() => []);
    setPosts(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const effectiveId = await getEffectiveUserId(user?.id ?? null);
      if (!cancelled) {
        setUserId(effectiveId);
        setAuthResolved(true);
      }
    })();
    const t = setTimeout(() => {
      if (!cancelled) setAuthResolved(true);
    }, AUTH_RESOLVE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setPosts([]);
      return;
    }
    setLoading(true);
    fetchReady().finally(() => setLoading(false));
  }, [userId, fetchReady]);

  if (!authResolved) {
    return (
      <div className="section-frame p-6">
        <div className="h-6 w-48 rounded bg-slate-800/80 animate-pulse mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="section-frame p-6">
        <SectionHeader title="Ready to Ship" subtitle="Videos ready to schedule or post" />
        <p className="text-sm text-slate-400">Sign in to see your ready content.</p>
      </div>
    );
  }

  return (
    <div className="section-frame p-6 space-y-4">
      <SectionHeader
        title="Ready to Ship"
        subtitle="Videos ready to schedule or post. Click a card for details and copy."
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-slate-400">
          No ready videos yet. Move content to Ready in Production or Post Lab.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => {
            const thumb = getPlayableVideoUrl(post.final_video_url || post.background_video_url);
            return (
              <button
                type="button"
                key={post.id}
                onClick={() => setSelected(post)}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-0 overflow-hidden text-left hover:border-amber-500/40 hover:ring-1 hover:ring-amber-500/30 transition"
              >
                <div className="aspect-video bg-slate-900 flex items-center justify-center">
                  {thumb ? (
                    <video
                      src={thumb}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <Video className="h-10 w-10 text-slate-600" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-100 truncate">
                    {post.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Ready</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail drawer / modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="library-ready-detail-title"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
              <h2 id="library-ready-detail-title" className="text-base font-semibold text-slate-100 truncate pr-2">
                {selected.title || 'Ready post'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!selected) return;
                    setEvaluating(true);
                    try {
                      const res = await fetch('/api/brain/evaluate', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ entityType: 'post', entityId: selected.id }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data.error || 'Evaluate failed');
                      setBrainEval(data as BrainEvalResult);
                      setBrainModalOpen(true);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Evaluate failed');
                    } finally {
                      setEvaluating(false);
                    }
                  }}
                  disabled={evaluating}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {evaluating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Evaluate
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {selected.script_content?.hook && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Hook</span>
                    <CopyButton label="Hook" text={selected.script_content.hook} />
                  </div>
                  <p className="text-sm text-slate-200 rounded-lg bg-slate-900/80 p-3">
                    {selected.script_content.hook}
                  </p>
                </div>
              )}
              {selected.script_content?.meat && selected.script_content.meat.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Beats</span>
                    <CopyButton
                      label="Beats"
                      text={selected.script_content.meat.join('\n')}
                    />
                  </div>
                  <ul className="text-sm text-slate-200 rounded-lg bg-slate-900/80 p-3 list-disc list-inside space-y-1">
                    {selected.script_content.meat.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selected.script_content?.cta && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">CTA</span>
                    <CopyButton label="CTA" text={selected.script_content.cta} />
                  </div>
                  <p className="text-sm text-slate-200 rounded-lg bg-slate-900/80 p-3">
                    {selected.script_content.cta}
                  </p>
                </div>
              )}
              {selected.caption && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Caption</span>
                    <CopyButton label="Caption" text={selected.caption} />
                  </div>
                  <p className="text-sm text-slate-200 rounded-lg bg-slate-900/80 p-3 whitespace-pre-wrap">
                    {selected.caption}
                  </p>
                </div>
              )}
              {selected.hashtags && selected.hashtags.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Hashtags</span>
                    <CopyButton
                      label="Hashtags"
                      text={selected.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.hashtags.map((tag, i) => (
                      <span key={i} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <BRollPanel
                postId={selected.id}
                onBackgroundSet={() => fetchReady()}
              />
            </div>
          </div>
        </div>
      )}

      <BrainScorecardModal
        isOpen={brainModalOpen}
        onClose={() => setBrainModalOpen(false)}
        evalResult={brainEval}
        onAfterGenerateV2={() => { fetchReady(); if (selected) setSelected(null); }}
      />
    </div>
  );
}
