import {
  computeEngagementScore,
  evaluatePredictionAccuracy,
  type PerformanceMetrics,
} from './analytics';

export interface PostIntelligenceSummary {
  predictedScore: number;
  actualScore?: number;
  difference?: number;
  performanceLevel: 'underperforming' | 'average' | 'strong' | 'viral';
  wasOverPredicted?: boolean;
  wasUnderPredicted?: boolean;
  insight: string;
}

function classifyPerformance(score: number): PostIntelligenceSummary['performanceLevel'] {
  if (score < 40) return 'underperforming';
  if (score < 60) return 'average';
  if (score < 80) return 'strong';
  return 'viral';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- second return branch is under-predicted case
function buildInsight(
  predictedScore: number,
  actualScore: number,
  wasOverPredicted: boolean,
  wasUnderPredicted: boolean
): string {
  const diff = Math.abs(actualScore - predictedScore);
  if (diff <= 5) return 'Performance aligned with prediction.';
  if (wasOverPredicted) return `Post underperformed prediction by ${Math.round(diff)} pts. Review hook and CTA.`;
  void wasUnderPredicted; // used for API symmetry
  return `Post outperformed prediction by ${Math.round(diff)} pts. Replicate what worked.`;
}

// TODO: Future system could aggregate across posts, detect niche bias, and adjust scoring weights dynamically.
export function generatePostIntelligence(
  predictedScore: number,
  metrics?: PerformanceMetrics
): PostIntelligenceSummary {
  const clampedPredicted = Math.min(100, Math.max(0, predictedScore));

  if (!metrics) {
    return {
      predictedScore: clampedPredicted,
      performanceLevel: classifyPerformance(clampedPredicted),
      insight: 'No performance data yet. Score is prediction-only.',
    };
  }

  const actualScore = computeEngagementScore(metrics);
  const { difference, wasOverPredicted, wasUnderPredicted } = evaluatePredictionAccuracy(
    clampedPredicted,
    actualScore
  );
  const level = classifyPerformance(actualScore);

  return {
    predictedScore: clampedPredicted,
    actualScore,
    difference,
    performanceLevel: level,
    wasOverPredicted,
    wasUnderPredicted,
    insight: buildInsight(clampedPredicted, actualScore, wasOverPredicted ?? false, wasUnderPredicted ?? false),
  };
}
