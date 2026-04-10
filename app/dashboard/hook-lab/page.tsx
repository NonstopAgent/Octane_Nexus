'use client';

import { useState } from 'react';
import { Loader2, Mic, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import type { HookLine } from '@/lib/hookLab';

export default function HookLabPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [hooks, setHooks] = useState<HookLine[]>([]);

  async function generate() {
    const t = topic.trim();
    if (!t) {
      toast.error('Enter a video topic');
      return;
    }
    setLoading(true);
    setHooks([]);
    try {
      const res = await fetch('/api/hook-lab/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'Generation failed');
      }
      setHooks((data as { hooks: HookLine[] }).hooks || []);
      toast.success('Hooks generated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <DashboardPageHeader
        title="Hook Lab"
        subtitle="Ten opening lines grounded in your real videos and tracked competitors."
        icon={<Mic className="h-5 w-5" />}
      />

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
        <label htmlFor="hook-topic" className="text-sm font-medium text-slate-300">
          Video topic
        </label>
        <textarea
          id="hook-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Why your iPhone battery dies faster after iOS updates"
          rows={3}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
        />
        <button
          type="button"
          onClick={() => generate()}
          disabled={loading || !topic.trim()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate 10 hooks
        </button>
        <p className="mt-3 text-xs text-slate-500">
          Connect YouTube on Memory and track competitors on Daily Brief so hooks mirror what actually
          performs in your niche.
        </p>
      </div>

      {hooks.length > 0 && (
        <ul className="space-y-3">
          {hooks.map((h, i) => (
            <li
              key={i}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <p className="text-sm font-medium text-slate-100">&ldquo;{h.hook}&rdquo;</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">
                  {h.pattern}
                </span>
                <span className="text-slate-500">Inspired by:</span>
                <span className="text-slate-400">{h.inspired_by}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
