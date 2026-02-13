'use client';

import { useState, useEffect } from 'react';
import { Loader2, Flame, HelpCircle } from 'lucide-react';
import { applyCalibrationFeedback } from '@/lib/gemini';
import {
  getRealityCheckEntries,
  updateRealityCheckOutcome,
  addRealityCheckEntry,
  getRealityCheckAccuracy,
  type RealityCheckEntry,
  type RealityCheckOutcome,
} from '@/lib/reality-check-storage';

const MOCK_ITEMS: RealityCheckEntry[] = [
  {
    id: 'mock-1',
    idea: 'The 15-minute content system that lets you post daily without burning out',
    predictedScore: 92,
    predictionSummary: 'Predicted Viral Score: 92/100 – strong hook, clear transformation, high shareability.',
    loggedAt: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    idea: 'Why most creators are still editing videos like it’s 2018',
    predictedScore: 88,
    predictionSummary: 'Predicted Viral Score: 88/100 – contrarian angle with good potential for comments.',
    loggedAt: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    idea: 'Behind the scenes of building my first digital product from scratch',
    predictedScore: 79,
    predictionSummary: 'Predicted Viral Score: 79/100 – solid story hook, but needs a stronger opening line.',
    loggedAt: new Date().toISOString(),
  },
];

export default function RealityCheck() {
  const [items, setItems] = useState<RealityCheckEntry[]>(MOCK_ITEMS);
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [calibratingId, setCalibratingId] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<ReturnType<typeof getRealityCheckAccuracy> | null>(null);

  function refreshFromStorage() {
    const local = getRealityCheckEntries();
    if (local.length > 0) {
      setItems(local);
      setIsLocalOnly(true);
    }
    setAccuracy(getRealityCheckAccuracy());
  }

  useEffect(() => {
    refreshFromStorage();
  }, []);

  async function handleFeedback(id: string, outcome: RealityCheckOutcome) {
    setCalibratingId(id);
    const item = items.find((i) => i.id === id);
    if (!item) {
      setTimeout(() => setCalibratingId(null), 300);
      return;
    }
    if (id.startsWith('local-')) {
      updateRealityCheckOutcome(id, outcome);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, outcome } : i))
      );
      setAccuracy(getRealityCheckAccuracy());
    } else {
      addRealityCheckEntry({
        idea: item.idea,
        predictedScore: item.predictedScore,
        predictionSummary: item.predictionSummary,
        outcome,
      });
      applyCalibrationFeedback(item.predictedScore ?? 0, outcome);
      refreshFromStorage();
    }
    setTimeout(() => setCalibratingId(null), 1400);
  }

  const showAccuracy = accuracy && accuracy.totalWithOutcome > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-slate-100">Reality Check</h2>
          {isLocalOnly && (
            <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 uppercase tracking-wide">
              Local only
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <HelpCircle className="h-3 w-3" />
          <span>Tell the AI what actually happened.</span>
        </div>
      </div>

      {showAccuracy && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-wrap items-center gap-6">
          <div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Prediction accuracy</p>
            <p className="text-2xl font-bold text-amber-400">{accuracy!.accuracyPercent}%</p>
            <p className="text-[11px] text-slate-500">based on {accuracy!.totalWithOutcome} outcomes</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Overpredicted</p>
              <p className="text-sm font-semibold text-rose-300/90">{accuracy!.overpredictedCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Underpredicted</p>
              <p className="text-sm font-semibold text-emerald-300/90">{accuracy!.underpredictedCount}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col gap-3"
          >
            <div className="text-sm text-slate-100 leading-relaxed">
              {item.idea}
            </div>
            {item.predictionSummary && (
              <p className="text-xs text-slate-400">{item.predictionSummary}</p>
            )}
            {item.loggedAt && (
              <p className="text-[10px] text-slate-500">
                Logged {new Date(item.loggedAt).toLocaleDateString()}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleFeedback(item.id, 'viral')}
                disabled={calibratingId === item.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                🔥 It went Viral
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(item.id, 'average')}
                disabled={calibratingId === item.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                😐 Average
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(item.id, 'flop')}
                disabled={calibratingId === item.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                📉 It Flopped
              </button>

              {calibratingId === item.id && (
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

