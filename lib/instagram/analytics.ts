export interface PerformanceMetrics {
  likes: number;
  comments: number;
  reach: number;
  saves?: number;
  shares?: number;
  followersAtPost?: number;
}

// Weights: comments and saves count more than likes for engagement quality.
// TODO: Future system could store prediction vs performance history, dynamically adjust these weights, and identify hook patterns that outperform predictions.
const WEIGHT_LIKES = 1;
const WEIGHT_COMMENTS = 2;
const WEIGHT_SAVES = 2;
const WEIGHT_SHARES = 1.5;

const ENGAGEMENT_CEILING = 0.15; // 15% engagement treated as 100

function weightedEngagement(m: PerformanceMetrics): number {
  const likes = Math.max(0, m.likes ?? 0);
  const comments = Math.max(0, m.comments ?? 0);
  const saves = Math.max(0, m.saves ?? 0);
  const shares = Math.max(0, m.shares ?? 0);
  return WEIGHT_LIKES * likes + WEIGHT_COMMENTS * comments + WEIGHT_SAVES * saves + WEIGHT_SHARES * shares;
}

export function computeEngagementScore(metrics: PerformanceMetrics): number {
  const reach = metrics?.reach ?? 0;
  if (!Number.isFinite(reach) || reach <= 0) return 0;

  const weighted = weightedEngagement(metrics);
  const engagementRate = weighted / reach;
  const normalized = Math.min(1, Math.max(0, engagementRate / ENGAGEMENT_CEILING));
  const score = Math.round(Math.min(100, normalized * 100));
  return Number.isFinite(score) ? score : 0;
}

export function evaluatePredictionAccuracy(
  predictedScore: number,
  actualEngagementScore: number
): {
  difference: number;
  wasOverPredicted: boolean;
  wasUnderPredicted: boolean;
} {
  const p = Number.isFinite(predictedScore) ? predictedScore : 0;
  const a = Number.isFinite(actualEngagementScore) ? actualEngagementScore : 0;
  const diff = a - p;
  const difference = Number.isFinite(diff) ? Math.round(diff * 10) / 10 : 0;
  return {
    difference,
    wasOverPredicted: diff < 0,
    wasUnderPredicted: diff > 0,
  };
}
