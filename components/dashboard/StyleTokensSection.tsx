'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Star, Edit2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import type { StyleTokensPayload, CaptionStyle } from '@/lib/style-tokens';
import { DEFAULT_STYLE_TOKENS } from '@/lib/style-tokens';

type StyleTokenRecord = {
  id: string;
  user_id: string;
  name: string;
  tokens: StyleTokensPayload;
  is_default: boolean;
  created_at: string;
};

const POSITION_OPTIONS: { value: CaptionStyle['position']; label: string }[] = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
];

export default function StyleTokensSection() {
  const [tokens, setTokens] = useState<StyleTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [setDefaultLoading, setSetDefaultLoading] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [captionPosition, setCaptionPosition] = useState<CaptionStyle['position']>('bottom');
  const [captionMaxLines, setCaptionMaxLines] = useState(2);
  const [introEnabled, setIntroEnabled] = useState(false);
  const [introTemplate, setIntroTemplate] = useState('{{title}} — watch this.');
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [ctaTemplate, setCtaTemplate] = useState('Follow for more. Like & save if this helped.');
  const [maxSentenceLength, setMaxSentenceLength] = useState(120);

  const fetchTokens = useCallback(async () => {
    const res = await fetch('/api/style-tokens', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json().catch(() => []);
    setTokens(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchTokens().finally(() => setLoading(false));
  }, [fetchTokens]);

  function openCreate() {
    setEditingId(null);
    setName('');
    setCaptionPosition(DEFAULT_STYLE_TOKENS.caption_style?.position ?? 'bottom');
    setCaptionMaxLines(DEFAULT_STYLE_TOKENS.caption_style?.maxLines ?? 2);
    setIntroEnabled(DEFAULT_STYLE_TOKENS.intro_pattern?.enabled ?? false);
    setIntroTemplate(DEFAULT_STYLE_TOKENS.intro_pattern?.textTemplate ?? '{{title}} — watch this.');
    setCtaEnabled(DEFAULT_STYLE_TOKENS.cta_pattern?.enabled ?? true);
    setCtaTemplate(DEFAULT_STYLE_TOKENS.cta_pattern?.template ?? 'Follow for more. Like & save if this helped.');
    setMaxSentenceLength(DEFAULT_STYLE_TOKENS.pacing?.maxSentenceLength ?? 120);
    setModalOpen(true);
  }

  function openEdit(t: StyleTokenRecord) {
    setEditingId(t.id);
    setName(t.name);
    const cap = t.tokens?.caption_style;
    setCaptionPosition(cap?.position ?? 'bottom');
    setCaptionMaxLines(cap?.maxLines ?? 2);
    const intro = t.tokens?.intro_pattern;
    setIntroEnabled(intro?.enabled ?? false);
    setIntroTemplate(intro?.textTemplate ?? '{{title}} — watch this.');
    const cta = t.tokens?.cta_pattern;
    setCtaEnabled(cta?.enabled ?? true);
    setCtaTemplate(cta?.template ?? 'Follow for more. Like & save if this helped.');
    const pace = t.tokens?.pacing;
    setMaxSentenceLength(pace?.maxSentenceLength ?? 120);
    setModalOpen(true);
  }

  function buildPayload(): StyleTokensPayload {
    return {
      caption_style: {
        fontFamily: 'Inter',
        fontWeight: '600',
        fontSize: 18,
        position: captionPosition,
        maxLines: captionMaxLines,
        outline: true,
        shadow: true,
      },
      intro_pattern: { enabled: introEnabled, textTemplate: introTemplate },
      cta_pattern: { enabled: ctaEnabled, template: ctaTemplate },
      pacing: {
        maxSentenceLength: maxSentenceLength,
        cutEverySeconds: 8,
        patternInterruptEverySeconds: 30,
      },
    };
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        const res = await fetch(`/api/style-tokens/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: trimmedName, tokens: payload }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.error ?? 'Update failed');
          return;
        }
        toast.success('Style updated');
      } else {
        const res = await fetch('/api/style-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: trimmedName, tokens: payload }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.error ?? 'Create failed');
          return;
        }
        toast.success('Style created');
      }
      setModalOpen(false);
      await fetchTokens();
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    setSetDefaultLoading(id);
    try {
      const res = await fetch(`/api/style-tokens/${id}/set-default`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Set default failed');
        return;
      }
      toast.success('Default style updated');
      await fetchTokens();
    } finally {
      setSetDefaultLoading(null);
    }
  }

  const previewPayload = buildPayload();
  const previewIntro = introEnabled ? introTemplate.replace(/\{\{title\}\}/g, 'Your Video Title') : null;
  const previewCta = ctaEnabled ? ctaTemplate : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-50 mb-4">Style Tokens</h2>
      <p className="text-sm text-slate-400">
        Save reusable visual and copy styles. Octane applies your default style to captions, CTAs, and generation.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
        >
          <Plus className="h-4 w-4" />
          Create style
        </button>
      </div>

      <div className="grid gap-4">
        {tokens.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
            No style packs yet. Create one to set a default for captions and CTAs.
          </div>
        ) : (
          tokens.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-100">{t.name}</p>
                  {t.is_default && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400 mt-0.5">
                      <Star className="h-3 w-3 fill-current" /> Default
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700 transition"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                {!t.is_default && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(t.id)}
                    disabled={setDefaultLoading === t.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition"
                  >
                    {setDefaultLoading === t.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Star className="h-3.5 w-3.5" />
                    )}
                    Set default
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview card */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-6">
        <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3">Preview</h3>
        <div className="aspect-video rounded-lg bg-slate-900 flex flex-col justify-end p-4 text-center">
          <p className="text-slate-300 text-sm line-clamp-2">
            {previewIntro && <span className="block text-slate-400 text-xs mb-1">{previewIntro}</span>}
            Sample caption line one. Keep it short for {previewPayload.caption_style?.position}.
          </p>
          {previewCta && (
            <p className="text-amber-400 text-xs font-medium mt-2">{previewCta}</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-slate-50">
                {editingId ? 'Edit style' : 'New style'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shorts Bold"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Caption position</label>
                <select
                  value={captionPosition}
                  onChange={(e) => setCaptionPosition(e.target.value as CaptionStyle['position'])}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  {POSITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Caption max lines</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={captionMaxLines}
                  onChange={(e) => setCaptionMaxLines(Number(e.target.value) || 2)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={introEnabled}
                    onChange={(e) => setIntroEnabled(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  Intro pattern enabled
                </label>
                <input
                  type="text"
                  value={introTemplate}
                  onChange={(e) => setIntroTemplate(e.target.value)}
                  placeholder="{{title}} — watch this."
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Use {'{{title}}'} for the post title.</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={ctaEnabled}
                    onChange={(e) => setCtaEnabled(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  CTA pattern enabled
                </label>
                <input
                  type="text"
                  value={ctaTemplate}
                  onChange={(e) => setCtaTemplate(e.target.value)}
                  placeholder="Follow for more."
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Max sentence length (pacing)</label>
                <input
                  type="number"
                  min={40}
                  max={200}
                  value={maxSentenceLength}
                  onChange={(e) => setMaxSentenceLength(Number(e.target.value) || 120)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingId ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
