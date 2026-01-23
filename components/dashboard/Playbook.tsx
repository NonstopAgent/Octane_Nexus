'use client';

import { useEffect, useState } from 'react';
import { Flame, Sparkles, CheckCircle2, Star } from 'lucide-react';
import {
  getPlaybookEntries,
  getWinningHooks,
  getValidatedScripts,
  getPlaybookInsights,
  type PlaybookEntry,
} from '@/lib/playbook';

export default function Playbook() {
  const [entries, setEntries] = useState<PlaybookEntry[]>([]);
  const [hooks, setHooks] = useState<PlaybookEntry[]>([]);
  const [scripts, setScripts] = useState<PlaybookEntry[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const all = getPlaybookEntries();
    setEntries(all);
    setHooks(getWinningHooks());
    setScripts(getValidatedScripts());
    setInsights(getPlaybookInsights());
  }, []);

  const hasData = entries.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1: Winning Hooks */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-100">Winning Hooks</h3>
          </div>
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Score &gt; 90
          </span>
        </div>
        {!hasData || hooks.length === 0 ? (
          <p className="text-xs text-slate-500">
            When you add high‑scoring hooks to the Playbook, they’ll appear here as your
            personal swipe file.
          </p>
        ) : (
          <div className="space-y-3">
            {hooks.slice(0, 6).map((hook) => (
              <div
                key={hook.id}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide">
                    Hook • {hook.score}/100
                  </span>
                  <Star className="h-3 w-3 text-amber-300" />
                </div>
                <p className="text-sm text-slate-50 leading-relaxed line-clamp-3">
                  {hook.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Column 2: Validated Scripts */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">Validated Scripts</h3>
          </div>
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Ready to Film
          </span>
        </div>
        {!hasData || scripts.length === 0 ? (
          <p className="text-xs text-slate-500">
            Scripts you mark as winners will live here as your go‑to templates for future
            content.
          </p>
        ) : (
          <div className="space-y-3">
            {scripts.slice(0, 4).map((script) => (
              <div
                key={script.id}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2"
              >
                <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wide">
                  Script • {script.score}/100
                </span>
                <p className="mt-1 text-sm text-slate-50 leading-relaxed line-clamp-4">
                  {script.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Column 3: AI Learnings */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100">AI Learnings</h3>
          </div>
          <span className="text-[11px] uppercase tracking-wide text-slate-500">
            Patterns
          </span>
        </div>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"
            >
              <p className="text-xs text-slate-200 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
        {!hasData && (
          <p className="mt-3 text-[11px] text-slate-500">
            As you add winners, this section will turn into a living playbook of what
            actually moves your metrics.
          </p>
        )}
      </div>
    </div>
  );
}

