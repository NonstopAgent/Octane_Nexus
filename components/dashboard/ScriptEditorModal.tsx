'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { POST_STATUS, type PostStatus } from '@/lib/status';
import { createVersionAction } from '@/actions/create-version';

type ScriptContent = {
  hook?: string;
  meat?: string[];
  cta?: string;
  setup_tip?: string;
  name?: string;
};

type ContentPost = {
  id: string;
  user_id: string;
  title: string;
  script_content: ScriptContent | null;
  status: PostStatus;
  audio_url?: string | null;
  background_video_url?: string | null;
  final_video_url?: string | null;
  created_at: string;
  updated_at: string;
  version?: number;
  parent_post_id?: string | null;
};

type ScriptEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  post: ContentPost | null;
  onUpdate: () => void;
};

const STATUS_OPTIONS: { value: ContentPost['status']; label: string }[] = [
  { value: POST_STATUS.IDEA, label: 'Idea' },
  { value: POST_STATUS.SCRIPTING, label: 'Scripting' },
  { value: POST_STATUS.FILMING, label: 'Filming' },
  { value: POST_STATUS.POSTED, label: 'Posted' },
  { value: POST_STATUS.GENERATING, label: 'Generating' },
  { value: POST_STATUS.READY, label: 'Ready' },
];

export default function ScriptEditorModal({
  isOpen,
  onClose,
  post,
  onUpdate,
}: ScriptEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'script' | 'settings'>('script');
  const [scriptSection, setScriptSection] = useState<'hook' | 'meat' | 'cta'>('hook');
  const [hookRewriting, setHookRewriting] = useState(false);
  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');
  const [meat, setMeat] = useState<string[]>([]);
  const [cta, setCta] = useState('');
  const [status, setStatus] = useState<ContentPost['status']>(POST_STATUS.SCRIPTING);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [generating, setGenerating] = useState(false);
  const [localPost, setLocalPost] = useState<ContentPost | null>(null);

  // Load credits when post (and thus user) is available
  useEffect(() => {
    if (!post?.user_id) {
      setCredits(0);
      return;
    }
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', post.user_id)
          .single();
        setCredits((data?.credits ?? 50) as number);
      } catch (err) {
        console.error('Failed to load credits:', err);
        setCredits(50);
      }
    })();
  }, [post?.user_id]);

  // Sync form when post changes
  useEffect(() => {
    if (post) {
      setTitle(post.title || '');
      setStatus(post.status);
      setLocalPost(post);
      const sc = post.script_content || {};
      setHook(sc.hook || '');
      setMeat(Array.isArray(sc.meat) && sc.meat.length > 0 ? [...sc.meat] : ['']);
      setCta(sc.cta || '');
    } else {
      setLocalPost(null);
    }
  }, [post]);

  if (!isOpen) return null;
  if (!post) return null;

  async function handleSave() {
    if (!post) return;
    setSaving(true);
    const scriptContent: ScriptContent = {
      ...(post.script_content || {}),
      hook,
      meat: meat.filter((m) => m.trim()),
      cta,
    };

    const { error } = await supabase
      .from('content_posts')
      .update({
        title,
        script_content: scriptContent,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id);

    if (error) {
      console.error('Failed to save:', error);
    } else {
      onUpdate();
      onClose();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!post || !confirm('Delete this post? This cannot be undone.')) return;

    setDeleting(true);
    const { error } = await supabase.from('content_posts').delete().eq('id', post.id);

    if (error) {
      console.error('Failed to delete:', error);
    } else {
      onUpdate();
      onClose();
    }
    setDeleting(false);
  }

  async function handleGenerate() {
    if (!post) return;
    setGenerating(true);
    try {
      let targetPostId = post.id;
      if (post.status === POST_STATUS.READY) {
        const versionResult = await createVersionAction({
          postId: post.id,
          createdFromAction: 'regenerate_assets',
        });
        if ('error' in versionResult) {
          toast.error(versionResult.error);
          return;
        }
        targetPostId = versionResult.newPostId;
        toast.success('New version created. Generating assets…');
      }
      const res = await fetch('/api/generate-video-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: targetPostId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      if (post.status === POST_STATUS.READY) {
        onUpdate();
        onClose();
        return;
      }
      setLocalPost((prev) =>
        prev ? { ...prev, audio_url: data.audioUrl, background_video_url: data.backgroundVideoUrl, status: POST_STATUS.READY } : null
      );
      setStatus(POST_STATUS.READY);
      setCredits((c) => Math.max(0, c - 10));
      onUpdate();
    } catch (err) {
      console.error('Generate failed:', err);
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function updateMeat(index: number, value: string) {
    setMeat((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addMeatRow() {
    setMeat((prev) => [...prev, '']);
  }

  function removeMeatRow(index: number) {
    setMeat((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));
  }

  function handleAIRewrite() {
    setHookRewriting(true);
    setTimeout(() => {
      setHookRewriting(false);
    }, 1200);
  }

  const displayPost = localPost ?? post;
  const showPreview =
    displayPost?.status === POST_STATUS.READY ||
    !!displayPost?.audio_url ||
    !!displayPost?.background_video_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" data-testid="script-editor-modal">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 gap-4 flex-wrap">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 min-w-[120px] rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            placeholder="Title"
          />
          {(displayPost?.version ?? post?.version) != null && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300">
              v{(displayPost?.version ?? post?.version)}
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 whitespace-nowrap">
            Credits: {credits}
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ContentPost['status'])}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 pt-4 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === 'script'
                ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Script
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'script' && (
            <div className="space-y-4">
              {/* Script Doctor: 3-section tabs */}
              <div className="flex gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
                <button
                  type="button"
                  onClick={() => setScriptSection('hook')}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    scriptSection === 'hook' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  The Hook (0-3s)
                </button>
                <button
                  type="button"
                  onClick={() => setScriptSection('meat')}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    scriptSection === 'meat' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  The Meat (Body)
                </button>
                <button
                  type="button"
                  onClick={() => setScriptSection('cta')}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    scriptSection === 'cta' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  The CTA (Exit)
                </button>
              </div>

              {scriptSection === 'hook' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                      The Hook (0-3s) — Visual/audio grabber
                    </label>
                    <button
                      type="button"
                      onClick={handleAIRewrite}
                      disabled={hookRewriting}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      {hookRewriting ? 'Rewriting…' : 'AI Rewrite'}
                    </button>
                  </div>
                  <textarea
                    value={hook}
                    onChange={(e) => setHook(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                    placeholder="The first 3 seconds. No intro. Grab attention."
                  />
                </div>
              )}

              {scriptSection === 'meat' && (
                <div>
                  <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
                    The Meat (Body) — Actual value/tip
                  </label>
                <div className="space-y-2">
                  {meat.map((beat, idx) => (
                    <div key={idx} className="flex gap-2">
                      <textarea
                        value={beat}
                        onChange={(e) => updateMeat(idx, e.target.value)}
                        rows={2}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                        placeholder={`Point ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeMeatRow(idx)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition self-start"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMeatRow}
                    className="text-sm text-amber-400 hover:text-amber-300 transition"
                  >
                    + Add point
                  </button>
                </div>
              </div>
              )}

              {scriptSection === 'cta' && (
                <div>
                  <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
                    The CTA (Exit) — Sales pitch
                  </label>
                  <textarea
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                    placeholder="Call to action. Save, follow, link in bio..."
                  />
                </div>
              )}

              {/* Video Generator - Preview Section */}
              {showPreview && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">Video Generator</h3>
                  {displayPost?.audio_url && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Voice</p>
                      <audio controls src={displayPost.audio_url} className="w-full h-10 rounded-lg" />
                    </div>
                  )}
                  {displayPost?.background_video_url && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Background</p>
                      <video
                        controls
                        className="w-full h-48 object-cover rounded-lg bg-slate-900"
                        src={displayPost.background_video_url}
                        muted
                        playsInline
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Permanently remove this post from your board.</p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/20 hover:border-rose-500 transition disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Post
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 flex-wrap">
          {activeTab === 'script' && (
            <>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={credits < 10 || generating}
                data-testid={post.status === POST_STATUS.READY ? 'regenerate-new-version-btn' : 'generate-assets-btn'}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-violet-500 bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 hover:border-violet-400 transition disabled:opacity-50"
              >
                {generating ? (
                  <span className="animate-pulse">Generating...</span>
                ) : post.status === POST_STATUS.READY ? (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Regenerate (new version)
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate Assets (10 Credits)
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || generating}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 hover:border-amber-400 transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
