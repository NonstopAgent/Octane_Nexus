'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { getViralTactics, type ViralTactic } from '@/lib/social-intelligence';

type TacticsGridProps = {
  niche?: string;
};

export default function TacticsGrid({ niche = 'content creation' }: TacticsGridProps) {
  const [tactics, setTactics] = useState<ViralTactic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getViralTactics(niche).then((data) => {
      setTactics(data);
      setLoading(false);
    });
  }, [niche]);

  function handleUseFormat(tactic: ViralTactic) {

    // Could open a modal or navigate to lab with this format pre-selected
    alert(`"${tactic.name}" format selected! Use this in your next video.`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="section-frame p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-400" />
        <h2 className="section-title">Viral Playbooks</h2>
      </div>
      <p className="mb-6 text-sm text-slate-400 body-bright">
        Filming tactics that actually work. Pick a format and film it today.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tactics.map((tactic) => (
          <div
            key={tactic.id}
            className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 transition duration-200 hover:border-slate-700 hover:shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-100">{tactic.name}</h3>
              <div className="flex gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    tactic.viral_potential === 'Very High'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {tactic.viral_potential}
                </span>
                <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300">
                  {tactic.difficulty}
                </span>
              </div>
            </div>
            <p className="mb-2 text-xs text-slate-400 leading-relaxed">
              {tactic.description}
            </p>
            <p className="mb-4 text-[11px] text-slate-500 italic">{tactic.example}</p>
            <button
              type="button"
              onClick={() => handleUseFormat(tactic)}
              className="w-full rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
            >
              Use This Format
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
