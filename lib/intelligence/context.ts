import type {
  HistoricalPostData,
  TimingPatternSummary,
  FormatPatternSummary,
  CrossPlatformSummary,
} from './patterns';
import { standardDeviation, safeAverage, hasEnoughForWeekOverWeek, ensurePostArray } from './validation';

export interface GrowthContextInput {
  recentPosts: HistoricalPostData[];
  timingSummary?: TimingPatternSummary;
  formatSummary?: FormatPatternSummary;
  platformSummary?: CrossPlatformSummary;
  niche?: string;
}

export interface GrowthContext {
  averagePredictedScore: number;
  averageActualScore: number;
  predictionBias: number;
  strongestPlatform?: string;
  weakestPlatform?: string;
  bestFormat?: string;
  weakestFormat?: string;
  bestPostingHours?: number[];
  keyInsights: string[];
  /** Recent week avg actual minus previous week avg; only when enough posts span 7+ days. */
  weekOverWeekChange?: number;
  /** 0–100; higher = more consistent posting cadence (lower hour spread). */
  consistencyScore?: number;
  /** Std dev of actualScore across posts; 0 when fewer than 2 posts. */
  engagementVolatility?: number;
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

function hourFromPostedAt(postedAt: string): number {
  const d = new Date(postedAt);
  return Number.isNaN(d.getTime()) ? 0 : d.getHours();
}

// TODO: Future: niche-specific behavior modeling, follower growth velocity integration, sentiment analysis integration.
export function buildGrowthContext(input: GrowthContextInput): GrowthContext {
  const posts = ensurePostArray(input.recentPosts);
  const n = posts.length;

  const sumPredicted = posts.reduce((s, p) => s + p.predictedScore, 0);
  const sumActual = posts.reduce((s, p) => s + p.actualScore, 0);
  const avgPredicted = safeAverage(sumPredicted, n);
  const avgActual = safeAverage(sumActual, n);
  const predictionBias = Math.round((avgActual - avgPredicted) * 10) / 10;

  const ctx: GrowthContext = {
    averagePredictedScore: Math.round(avgPredicted * 10) / 10,
    averageActualScore: Math.round(avgActual * 10) / 10,
    predictionBias,
    keyInsights: [],
  };

  if (input.platformSummary) {
    ctx.strongestPlatform = input.platformSummary.strongestPlatform;
    ctx.weakestPlatform = input.platformSummary.weakestPlatform;
  }
  if (input.formatSummary) {
    ctx.bestFormat = input.formatSummary.bestFormat || undefined;
    ctx.weakestFormat = input.formatSummary.weakestFormat || undefined;
  }
  if (input.timingSummary && input.timingSummary.topHours.length > 0) {
    ctx.bestPostingHours = input.timingSummary.topHours;
  }

  if (n >= 2) {
    ctx.engagementVolatility = Math.round(standardDeviation(posts.map((p) => p.actualScore)) * 10) / 10;
    const hours = posts.map((p) => hourFromPostedAt(p.postedAt));
    const hourStdDev = standardDeviation(hours);
    ctx.consistencyScore = Math.round(Math.max(0, 100 - Math.min(100, hourStdDev * 4)));
  }

  if (hasEnoughForWeekOverWeek(posts)) {
    const sorted = [...posts].sort(
      (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime()
    );
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const recent = sorted.filter((p) => new Date(p.postedAt).getTime() >= now - weekMs);
    const previous = sorted.filter((p) => {
      const t = new Date(p.postedAt).getTime();
      return t >= now - 2 * weekMs && t < now - weekMs;
    });
    const recentAvg = safeAverage(recent.reduce((s, p) => s + p.actualScore, 0), recent.length);
    const previousAvg = safeAverage(previous.reduce((s, p) => s + p.actualScore, 0), previous.length);
    if (recent.length > 0 && previous.length > 0) {
      ctx.weekOverWeekChange = Math.round((recentAvg - previousAvg) * 10) / 10;
    }
  }

  const insights: string[] = [];

  if (n > 0) {
    const biasNote = predictionBias > 0
      ? 'predictions are slightly conservative'
      : predictionBias < 0
        ? 'we tend to over-predict performance'
        : 'predictions align with actuals';
    insights.push(`Across ${n} posts: avg predicted ${ctx.averagePredictedScore}, actual ${ctx.averageActualScore}. ${biasNote}.`);
  }

  if (ctx.strongestPlatform && ctx.weakestPlatform) {
    insights.push(`${ctx.strongestPlatform} is your strongest platform; ${ctx.weakestPlatform} could use more focus or a strategy tweak.`);
  }
  if (ctx.bestFormat && ctx.bestFormat !== 'unknown') {
    insights.push(`${ctx.bestFormat} is your best-performing format—double down there.`);
  }
  if (ctx.weakestFormat && ctx.weakestFormat !== 'unknown' && ctx.weakestFormat !== ctx.bestFormat) {
    insights.push(`Consider posting less ${ctx.weakestFormat} or testing a new approach.`);
  }
  if (ctx.bestPostingHours && ctx.bestPostingHours.length > 0) {
    const times = ctx.bestPostingHours.map(formatHour).join(', ');
    insights.push(`Best posting times in your data: around ${times}.`);
  }
  if (input.niche?.trim()) {
    insights.push(`Niche context: ${input.niche.trim()}.`);
  }
  if (ctx.weekOverWeekChange !== undefined) {
    const dir = ctx.weekOverWeekChange > 0 ? 'up' : ctx.weekOverWeekChange < 0 ? 'down' : 'flat';
    insights.push(`Week-over-week engagement is ${dir} (${ctx.weekOverWeekChange > 0 ? '+' : ''}${ctx.weekOverWeekChange}).`);
  }
  if (ctx.consistencyScore !== undefined && ctx.consistencyScore < 50) {
    insights.push('Posting times are spread out; consider a more consistent schedule.');
  }
  if (ctx.engagementVolatility !== undefined && ctx.engagementVolatility > 20) {
    insights.push('Engagement varies a lot between posts—look for patterns in your top performers.');
  }

  ctx.keyInsights = insights.slice(0, 5);
  return ctx;
}
