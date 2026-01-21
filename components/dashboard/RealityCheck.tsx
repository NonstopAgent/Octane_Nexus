'use client';

import { useState } from 'react';
import { Loader2, Flame, HelpCircle } from 'lucide-react';
import { applyCalibrationFeedback } from '@/lib/gemini';

type Outcome = 'viral' | 'average' | 'flop';

type RealityItem = {
  id: string;
  idea: string;
  predictedScore: number;
  predictionSummary: string;
  outcome?: Outcome;
  calibrating?: boolean;
};

const MOCK_ITEMS: RealityItem[] = [
  {
    id: '1',
    idea: 'The 15-minute content system that lets you post daily without burning out',
    predictedScore: 92,
    predictionSummary: 'Predicted Viral Score: 92/100 – strong hook, clear transformation, high shareability.',
  },
  {
    id: '2',
    idea: 'Why most creators are still editing videos like it’s 2018',
    predictedScore: 88,
    predictionSummary: 'Predicted Viral Score: 88/100 – contrarian angle with good potential for comments.',
  },
  {
    id: '3',
    idea: 'Behind the scenes of building my first digital product from scratch',
    predictedScore: 79,
    predictionSummary: 'Predicted Viral Score: 79/100 – solid story hook, but needs a stronger opening line.',
  },
];

export default function RealityCheck() {
  const [items, setItems] = useState<RealityItem[]>(MOCK_ITEMS);

  async function handleFeedback(id: string, outcome: Outcome) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, calibrating: true, outcome } : item
      )
    );

    const item = items.find((i) => i.id === id);
    if (item) {
      applyCalibrationFeedback(item.predictedScore, outcome);
    }

    // Mock calibration animation delay
    setTimeout(() => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, calibrating: false } : item
        )
      );
    }, 1400);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-100">Reality Check</h2>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <HelpCircle className="h-3 w-3" />
          <span>Tell the AI what actually happened.</span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col gap-3"
          >
            <div className="text-sm text-slate-100 leading-relaxed">
              {item.idea}
            </div>
            <p className="text-xs text-slate-400">{item.predictionSummary}</p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleFeedback(item.id, 'viral')}
                disabled={item.calibrating}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                🔥 It went Viral
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(item.id, 'average')}
                disabled={item.calibrating}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                😐 Average
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(item.id, 'flop')}
                disabled={item.calibrating}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                📉 It Flopped
              </button>

              {item.calibrating && (
                <div className="flex items-center gap-2 text-[11px] text-amber-300 ml-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Calibrating algorithm…</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

