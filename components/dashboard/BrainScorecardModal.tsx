'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export type BrainEvalResult = {
  entityType: 'post' | 'clip';
  entityId: string;
  score: number;
  labels: Record<string, number | string | boolean>;
  issues: Array<{ id: string; message: string; severity: string }>;
  fixes: Array<{ id: string; message: string; apply?: string }>;
};

type BrainScorecardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  evalResult: BrainEvalResult | null;
  onAfterGenerateV2?: () => void;
};

export default function BrainScorecardModal({
  isOpen,
  onClose,
  evalResult,
  onAfterGenerateV2,
}: BrainScorecardModalProps) {
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const topIssues = (evalResult?.issues ?? []).slice(0, 3);
  const topFixes = (evalResult?.fixes ?? []).slice(0, 3);
  const isPost = evalResult?.entityType === 'post';
  const showGenerateV2 = isPost;

  async function handleGenerateV2() {
    if (!evalResult?.entityId) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/brain/generate-v2', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: evalResult.entityId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Generate v2 failed');
      toast.success('Version 2 generated. Post updated.');
      onAfterGenerateV2?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generate v2 failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brain-scorecard-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 id="brain-scorecard-title" className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Nexus Brain — Scorecard
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {evalResult ? (
            <>
              <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-4 py-3">
                <span className="text-sm font-medium text-slate-300">Retention score</span>
                <span
                  className={`text-2xl font-bold ${
                    evalResult.score >= 80 ? 'text-emerald-400' : evalResult.score >= 50 ? 'text-amber-400' : 'text-rose-400'
                  }`}
                >
                  {evalResult.score}
                </span>
              </div>
              {topIssues.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Top issues</p>
                  <ul className="space-y-1.5">
                    {topIssues.map((i) => (
                      <li key={i.id} className="text-sm text-slate-200 rounded-lg bg-slate-900/60 px-3 py-2 border border-slate-800">
                        {i.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {topFixes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Recommended fixes</p>
                  <ul className="space-y-1.5">
                    {topFixes.map((f) => (
                      <li key={f.id} className="text-sm text-slate-200 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                        {f.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showGenerateV2 && (
                <button
                  type="button"
                  onClick={handleGenerateV2}
                  disabled={generating}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate v2
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">No evaluation data.</p>
          )}
        </div>
      </div>
    </div>
  );
}
