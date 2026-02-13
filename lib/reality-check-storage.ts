/**
 * Local-only Reality Check entries (no DB table).
 * Use a consistent key and structure for Post Lab → Monitoring flow.
 */
export const REALITY_CHECK_STORAGE_KEY = 'octane_reality_check_entries';

export type RealityCheckOutcome = 'viral' | 'average' | 'flop';

export type RealityCheckEntry = {
  id: string;
  idea: string;
  predictedScore?: number;
  predictionSummary?: string;
  outcome?: RealityCheckOutcome;
  loggedAt: string;
};

function safeLoad(): RealityCheckEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REALITY_CHECK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RealityCheckEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function safeSave(entries: RealityCheckEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      REALITY_CHECK_STORAGE_KEY,
      JSON.stringify(entries)
    );
  } catch {
    // ignore
  }
}

export function getRealityCheckEntries(): RealityCheckEntry[] {
  return safeLoad();
}

export function addRealityCheckEntry(entry: {
  idea: string;
  predictedScore?: number;
  predictionSummary?: string;
  outcome: RealityCheckOutcome;
}): RealityCheckEntry {
  const existing = safeLoad();
  const newEntry: RealityCheckEntry = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    idea: entry.idea,
    predictedScore: entry.predictedScore,
    predictionSummary: entry.predictionSummary,
    outcome: entry.outcome,
    loggedAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...existing].slice(0, 100);
  safeSave(updated);
  return newEntry;
}

export function updateRealityCheckOutcome(
  id: string,
  outcome: RealityCheckOutcome
): void {
  const existing = safeLoad();
  const updated = existing.map((e) =>
    e.id === id ? { ...e, outcome } : e
  );
  safeSave(updated);
}

/** Prediction band: viral 80+, average 50-79, flop <50 */
function scoreBand(score: number): RealityCheckOutcome {
  if (score >= 80) return 'viral';
  if (score >= 50) return 'average';
  return 'flop';
}

export type RealityCheckAccuracy = {
  accuracyPercent: number;
  totalWithOutcome: number;
  overpredictedCount: number;
  underpredictedCount: number;
};

export function getRealityCheckAccuracy(): RealityCheckAccuracy {
  const entries = safeLoad();
  const withOutcome = entries.filter((e) => e.outcome && e.predictedScore != null);
  if (withOutcome.length === 0) {
    return { accuracyPercent: 0, totalWithOutcome: 0, overpredictedCount: 0, underpredictedCount: 0 };
  }
  let accurate = 0;
  let overpredicted = 0;
  let underpredicted = 0;
  for (const e of withOutcome) {
    const pred = e.predictedScore!;
    const outcome = e.outcome!;
    const predictedBand = scoreBand(pred);
    if (predictedBand === outcome) accurate++;
    if (pred >= 80 && outcome !== 'viral') overpredicted++;
    if (pred < 80 && outcome === 'viral') underpredicted++;
  }
  return {
    accuracyPercent: Math.round((accurate / withOutcome.length) * 100),
    totalWithOutcome: withOutcome.length,
    overpredictedCount: overpredicted,
    underpredictedCount: underpredicted,
  };
}
