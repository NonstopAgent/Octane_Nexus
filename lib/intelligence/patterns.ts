export interface HistoricalPostData {
  platform: 'instagram' | 'tiktok' | 'youtube';
  format: string;
  predictedScore: number;
  actualScore: number;
  postedAt: string;
  niche?: string;
}

export interface TimingPatternSummary {
  byHour: Record<number, number>;
  topHours: number[];
  lowestHour: number;
}

export interface FormatPatternSummary {
  byFormat: Record<string, number>;
  bestFormat: string;
  weakestFormat: string;
}

export interface CrossPlatformSummary {
  byPlatform: Record<string, number>;
  strongestPlatform: 'instagram' | 'tiktok' | 'youtube';
  weakestPlatform: 'instagram' | 'tiktok' | 'youtube';
}

function hourFromPostedAt(postedAt: string): number {
  const d = new Date(postedAt);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getHours();
}

// TODO: Future: correlate niche performance, prediction error trends, feed into dynamic scoring weights.
export function detectTimingPatterns(posts: HistoricalPostData[]): TimingPatternSummary {
  const byHour: Record<number, { sum: number; count: number }> = {};
  for (let h = 0; h < 24; h++) byHour[h] = { sum: 0, count: 0 };

  for (const p of posts) {
    const h = hourFromPostedAt(p.postedAt);
    byHour[h].sum += p.actualScore;
    byHour[h].count += 1;
  }

  const avgByHour: Record<number, number> = {};
  for (let h = 0; h < 24; h++) {
    avgByHour[h] = byHour[h].count > 0 ? byHour[h].sum / byHour[h].count : 0;
  }

  const entries = Object.entries(avgByHour)
    .filter(([, avg]) => avg > 0)
    .map(([h, avg]) => ({ hour: Number(h), avg }));
  const sorted = entries.sort((a, b) => b.avg - a.avg);
  const topHours = sorted.slice(0, 2).map((e) => e.hour);
  const lowest = sorted[sorted.length - 1];
  const lowestHour = lowest ? lowest.hour : 0;

  return {
    byHour: avgByHour,
    topHours,
    lowestHour,
  };
}

export function detectFormatPatterns(posts: HistoricalPostData[]): FormatPatternSummary {
  const byFormat: Record<string, { sum: number; count: number }> = {};

  for (const p of posts) {
    const f = p.format || 'unknown';
    if (!byFormat[f]) byFormat[f] = { sum: 0, count: 0 };
    byFormat[f].sum += p.actualScore;
    byFormat[f].count += 1;
  }

  const avgByFormat: Record<string, number> = {};
  for (const [f, data] of Object.entries(byFormat)) {
    avgByFormat[f] = data.count > 0 ? data.sum / data.count : 0;
  }

  const entries = Object.entries(avgByFormat).filter(([, avg]) => avg > 0);
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const bestFormat = sorted[0]?.[0] ?? '';
  const weakestFormat = sorted[sorted.length - 1]?.[0] ?? '';

  return {
    byFormat: avgByFormat,
    bestFormat,
    weakestFormat,
  };
}

export function compareCrossPlatformPerformance(
  posts: HistoricalPostData[]
): CrossPlatformSummary {
  const byPlatform: Record<string, { sum: number; count: number }> = {
    instagram: { sum: 0, count: 0 },
    tiktok: { sum: 0, count: 0 },
    youtube: { sum: 0, count: 0 },
  };

  for (const p of posts) {
    const pl = p.platform;
    if (byPlatform[pl]) {
      byPlatform[pl].sum += p.actualScore;
      byPlatform[pl].count += 1;
    }
  }

  const avgByPlatform: Record<string, number> = {};
  for (const [pl, data] of Object.entries(byPlatform)) {
    avgByPlatform[pl] = data.count > 0 ? data.sum / data.count : 0;
  }

  const entries = (Object.entries(avgByPlatform) as [string, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const strongestPlatform = (entries[0]?.[0] ?? 'instagram') as
    | 'instagram'
    | 'tiktok'
    | 'youtube';
  const weakestPlatform = (entries[entries.length - 1]?.[0] ?? 'instagram') as
    | 'instagram'
    | 'tiktok'
    | 'youtube';

  return {
    byPlatform: avgByPlatform,
    strongestPlatform,
    weakestPlatform,
  };
}
