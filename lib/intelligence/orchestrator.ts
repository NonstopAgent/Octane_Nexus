import type { NexusUserProfile } from './profile';
import type { GrowthContext } from './context';
import { buildGrowthContext } from './context';
import {
  detectTimingPatterns,
  detectFormatPatterns,
  compareCrossPlatformPerformance,
  type HistoricalPostData,
} from './patterns';
import {
  generateTimingAdvice,
  generateFormatAdvice,
  generatePlatformAdvice,
} from './coach';
import { ensurePostArray, standardDeviation } from './validation';

export interface OrchestratorInput {
  historicalPosts: HistoricalPostData[];
  userProfile: NexusUserProfile;
}

export interface OrchestratorStrategicFlags {
  inconsistentPosting?: boolean;
  overPredictionTrend?: boolean;
  underPredictionTrend?: boolean;
  platformMismatch?: boolean;
  formatInefficiency?: boolean;
  decliningTrend?: boolean;
  breakoutPost?: boolean;
  stagnantGrowth?: boolean;
}

export interface OrchestratorOutput {
  growthContext: GrowthContext;
  profile: NexusUserProfile;
  timingAdvice?: string;
  formatAdvice?: string;
  platformAdvice?: string;
  performanceSummary: {
    weeklyAverage: number;
    predictionBias: number;
  };
  strategicFlags: OrchestratorStrategicFlags;
}

function hourFromPostedAt(postedAt: string): number {
  const d = new Date(postedAt);
  return Number.isNaN(d.getTime()) ? 0 : d.getHours();
}

const POSTING_HOUR_STD_DEV_THRESHOLD = 4;
const DECLINING_TREND_HALF_RATIO = 0.9;
const BREAKOUT_Z_SCORE = 2;
const STAGNANT_AVG_MAX = 40;
const STAGNANT_VOLATILITY_MAX = 10;

// TODO: Next layer will convert structured output into Gemini prompt, enable proactive alerts, add weekly intelligence summaries.
export function buildNexusIntelligence(input: OrchestratorInput): OrchestratorOutput {
  const { historicalPosts, userProfile } = input;
  const posts = ensurePostArray(historicalPosts);

  const timingSummary = detectTimingPatterns(posts);
  const formatSummary = detectFormatPatterns(posts);
  const platformSummary = compareCrossPlatformPerformance(posts);

  const growthContext = buildGrowthContext({
    recentPosts: posts,
    timingSummary,
    formatSummary,
    platformSummary,
    niche: userProfile?.identity?.niche ?? '',
  });

  const n = posts.length;
  const totalActual = posts.reduce((s, p) => s + p.actualScore, 0);
  const weeklyAverage = n > 0 ? totalActual / n : 0;
  const predictionBias = growthContext.predictionBias;

  const hours = posts.map((p) => hourFromPostedAt(p.postedAt));
  const hourStdDev = standardDeviation(hours);
  const inconsistentPosting = hourStdDev > POSTING_HOUR_STD_DEV_THRESHOLD;

  const overPredictionTrend = predictionBias < -10;
  const underPredictionTrend = predictionBias > 10;
  const platformFocus = userProfile?.identity?.platformFocus ?? [];
  const strongestPlatform = growthContext.strongestPlatform;
  const platformMismatch =
    !!strongestPlatform && platformFocus.length > 0 && !platformFocus.includes(strongestPlatform as 'instagram' | 'tiktok' | 'youtube');
  const formatInefficiency =
    !!growthContext.weakestFormat &&
    !!userProfile?.behavior?.dominantFormat &&
    growthContext.weakestFormat === userProfile.behavior.dominantFormat;

  const actualScores = posts.map((p) => p.actualScore);
  const avgActual = n > 0 ? totalActual / n : 0;
  const vol = standardDeviation(actualScores);
  const decliningTrend =
    n >= 4 &&
    (() => {
      const sorted = [...posts].sort(
        (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime()
      );
      const mid = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, mid);
      const secondHalf = sorted.slice(mid);
      const firstAvg = firstHalf.reduce((s, p) => s + p.actualScore, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, p) => s + p.actualScore, 0) / secondHalf.length;
      return secondAvg < firstAvg * DECLINING_TREND_HALF_RATIO;
    })();
  const breakoutPost =
    n >= 2 && vol > 0 && actualScores.some((s) => s >= avgActual + BREAKOUT_Z_SCORE * vol);
  const stagnantGrowth =
    n >= 2 && avgActual <= STAGNANT_AVG_MAX && vol <= STAGNANT_VOLATILITY_MAX;

  return {
    growthContext,
    profile: userProfile,
    timingAdvice: generateTimingAdvice(timingSummary),
    formatAdvice: generateFormatAdvice(formatSummary),
    platformAdvice: generatePlatformAdvice(platformSummary),
    performanceSummary: {
      weeklyAverage: Math.round(weeklyAverage * 10) / 10,
      predictionBias,
    },
    strategicFlags: {
      inconsistentPosting,
      overPredictionTrend,
      underPredictionTrend,
      platformMismatch,
      formatInefficiency,
      decliningTrend,
      breakoutPost,
      stagnantGrowth,
    },
  };
}
