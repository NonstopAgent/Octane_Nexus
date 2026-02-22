'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Loader2, Film, Save } from 'lucide-react';
import type { VideoScriptVariation } from '@/lib/gemini';
import { supabase } from '@/lib/supabaseClient';
import { POST_STATUS } from '@/lib/status';

type ScriptWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  userId?: string | null;
  onSavedToBoard?: () => void;
};

export default function ScriptWizard({ isOpen, onClose, topic, userId, onSavedToBoard }: ScriptWizardProps) {
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<VideoScriptVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && topic.trim()) {
      setLoading(true);
      setError(null);
      setVariations([]);
      setSelectedVariation(0);

      fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), userId: userId || undefined }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to generate');
          const arr = Array.isArray(data) ? data : [];
          setVariations(arr);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, topic, userId]);

  function handleCopy() {
    const v = variations[selectedVariation];
    if (!v) return;

    const text = [
      `HOOK:\n${v.hook}`,
      `\nBODY:\n${v.meat?.join('\n\n') || ''}`,
      `\nCTA:\n${v.cta}`,
      `\nSETUP TIP:\n${v.setup_tip || ''}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
  }

  async function handleSaveToProject() {
    const v = variations[selectedVariation];
    if (!v || !userId) return;

    setSaving(true);
    try {
      const { error: err } = await supabase.from('content_posts').insert({
        user_id: userId,
        title: topic,
        script_content: v,
        status: POST_STATUS.SCRIPTING,
      });
      if (err) throw err;
      onSavedToBoard?.();
      onClose();
    } catch (e) {
      console.error('Failed to save to board:', e);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-slate-50">Script Wizard</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
              <p className="text-sm text-slate-400">Generating 3 script variations...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && variations.length > 0 && (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {variations.map((v, idx) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => setSelectedVariation(idx)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selectedVariation === idx
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>

              {/* Content */}
              {(() => {
                const v = variations[selectedVariation];
                if (!v) return null;

                return (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Hook</p>
                      <p className="text-sm text-slate-200 leading-relaxed">{v.hook}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Body</p>
                      <ul className="text-sm text-slate-200 leading-relaxed space-y-2 list-disc list-inside">
                        {v.meat?.map((beat, i) => (
                          <li key={i}>{beat}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">CTA</p>
                      <p className="text-sm text-slate-200 leading-relaxed">{v.cta}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Setup Tip</p>
                      <p className="text-sm text-slate-300 italic leading-relaxed">{v.setup_tip || '—'}</p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && variations.length > 0 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleSaveToProject}
              disabled={!userId || saving}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 hover:border-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save to Project
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
            >
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
