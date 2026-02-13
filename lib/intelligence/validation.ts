import type { HistoricalPostData } from './patterns';

const MIN_POSTS_FOR_WEEK_OVER_WEEK = 2;

/** True if posts array is empty or missing. */
export function isEmptyPosts(posts: HistoricalPostData[] | null | undefined): boolean {
  return !Array.isArray(posts) || posts.length === 0;
}

/** True if only one post (edge case for patterns). */
export function isSinglePost(posts: HistoricalPostData[] | null | undefined): boolean {
  return Array.isArray(posts) && posts.length === 1;
}

/** True if we have enough posts to compute week-over-week (need at least 2 and spread across time). */
export function hasEnoughForWeekOverWeek(posts: HistoricalPostData[]): boolean {
  if (!Array.isArray(posts) || posts.length < MIN_POSTS_FOR_WEEK_OVER_WEEK) return false;
  const sorted = [...posts].sort(
    (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime()
  );
  const first = new Date(sorted[0].postedAt).getTime();
  const last = new Date(sorted[sorted.length - 1].postedAt).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(last)) return false;
  const spanDays = (last - first) / (24 * 60 * 60 * 1000);
  return Number.isFinite(spanDays) && spanDays >= 7;
}

/** Safe default for average when denominator is zero. */
export function safeAverage(sum: number, count: number): number {
  return count > 0 ? sum / count : 0;
}

/** Standard deviation of a numeric array. Returns 0 for fewer than 2 finite values. */
export function standardDeviation(values: number[]): number {
  const finite = Array.isArray(values) ? values.filter((v) => Number.isFinite(v)) : [];
  if (finite.length < 2) return 0;
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
  const sqDiffs = finite.map((v) => (v - mean) ** 2);
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / finite.length;
  const sd = Math.sqrt(variance);
  return Number.isFinite(sd) ? sd : 0;
}

/** Guard: ensure historicalPosts is an array (never throw). */
export function ensurePostArray(
  posts: HistoricalPostData[] | null | undefined
): HistoricalPostData[] {
  return Array.isArray(posts) ? posts : [];
}

/** True when every post has actualScore below threshold (e.g. extremely low engagement). */
export function allPostsBelowActual(
  posts: HistoricalPostData[],
  threshold: number = 20
): boolean {
  if (!Array.isArray(posts) || posts.length === 0) return false;
  return posts.every((p) => Number.isFinite(p.actualScore) && p.actualScore < threshold);
}
