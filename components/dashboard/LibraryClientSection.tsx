'use client';

import { useState } from 'react';
import { Plus, Zap, Loader2, FileText, X, Copy, Check } from 'lucide-react';

// Local types (duplicated from lib/gemini so we can keep this component
// on the client without pulling the server-only GEMINI_API_KEY into
// the browser bundle).
type VideoConcept = {
  title?: string;
  angle?: string;
  hook?: string;
  outline?: string;
  visual?: string;
};

type VideoScript = {
  hook?: string;
  body?: string;
  cta?: string;
};

type LibraryClientSectionProps = {
  userNiche: string;
};

export default function LibraryClientSection({ userNiche }: LibraryClientSectionProps) {
  const [ideas, setIdeas] = useState<VideoConcept[]>([]);
  const [brainstorming, setBrainstorming] = useState(false);
  const [brainstormError, setBrainstormError] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<VideoScript | null>(null);
  const [loadingScriptIndex, setLoadingScriptIndex] = useState<number | null>(null);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleBrainstorm() {
    setBrainstorming(true);
    setBrainstormError(null);
    try {
      const res = await fetch('/api/generate-ideas', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: userNiche }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to generate ideas');
      }
      const concepts = Array.isArray((data as { concepts?: unknown }).concepts)
        ? ((data as { concepts: VideoConcept[] }).concepts)
        : [];
      setIdeas(concepts);
    } catch (error: unknown) {
      console.error('Failed to brainstorm ideas:', error);
      setBrainstormError(error instanceof Error ? error.message : 'Failed to generate ideas.');
    } finally {
      setBrainstorming(false);
    }
  }

  async function handleScriptIt(idea: VideoConcept, index: number) {
    setLoadingScriptIndex(index);
    setScriptError(null);
    setSelectedScript(null);
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: idea.title ?? '',
          angle: idea.angle ?? idea.hook ?? '',
          visual: idea.outline ?? '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to generate script');
      }
      const script = (data as { script?: VideoScript }).script || {};
      setSelectedScript(script);
    } catch (error: unknown) {
      console.error('Failed to generate script:', error);
      setScriptError(error instanceof Error ? error.message : 'Failed to generate script');
    } finally {
      setLoadingScriptIndex(null);
    }
  }

  function handleCopyScript() {
    if (!selectedScript) return;
    const fullScript = `${selectedScript?.hook ?? ''}\n\n${selectedScript?.body ?? ''}\n\n${selectedScript?.cta ?? ''}`;
    navigator.clipboard.writeText(fullScript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCloseModal() {
    setSelectedScript(null);
    setScriptError(null);
    setCopied(false);
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 min-h-[400px] p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-50">Ready-to-Film Scripts</h2>
          <button
            type="button"
            onClick={handleBrainstorm}
            disabled={brainstorming}
            className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {brainstorming ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Brainstorming...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Brainstorm Ideas
              </>
            )}
          </button>
        </div>

        {brainstormError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 mb-4">
            {brainstormError}
          </div>
        )}

        {ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">No content yet</h3>
            <p className="text-sm text-slate-400 mb-6">Generate ideas tailored to your niche</p>
            <button
              type="button"
              onClick={handleBrainstorm}
              disabled={brainstorming}
              className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition disabled:opacity-60"
            >
              {brainstorming ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Brainstorming...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Brainstorm Ideas
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4 hover:border-amber-500/50 transition"
              >
                <h3 className="text-base font-semibold text-amber-400 leading-tight">
                  {idea.title}
                </h3>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-xs font-medium text-slate-300">
                    <FileText className="h-3 w-3" />
                    {idea.angle ?? idea.hook}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{idea.outline}</p>
                <button
                  type="button"
                  onClick={() => handleScriptIt(idea, index)}
                  disabled={loadingScriptIndex === index}
                  className="w-full rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingScriptIndex === index ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Script It'
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Script Modal */}
      {selectedScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-50">Video Script</h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Hook</span>
                <p className="text-base text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedScript?.hook ?? ''}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Body</span>
                <p className="text-base text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedScript?.body ?? ''}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Call to Action</span>
                <p className="text-base text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedScript?.cta ?? ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCopyScript}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Script
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {scriptError && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 shadow-lg">
          {scriptError}
        </div>
      )}
    </>
  );
}
