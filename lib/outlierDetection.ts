/**
 * Outlier Detection Engine
 * ========================
 * Deterministic math layer that identifies which competitor videos are
 * genuinely outperforming their channel's baseline BEFORE the AI sees them.
 *
 * Why this matters: LLMs are bad at statistics. If you just dump all
 * competitor videos into a prompt and ask "what's viral?", the model
 * guesses based on absolute view counts (which favors big channels) or
 * recency bias. This module does the math first, then hands the AI only
 * the proven outliers with a calculated score — so the AI acts as an
 * analyst, not a guesser.
 *
 * Algorithm:
 *   1. For each competitor channel, compute the MEDIAN views-per-hour of
 *      their recent videos (median is more robust than mean — one viral
 *      hit doesn't inflate the baseline).
 *   2. Calculate an outlier score: video VPH / channel median VPH
 *   3. Flag any video with a score >= OUTLIER_THRESHOLD (default 2.5x)
 *      as an outlier worth studying.
 *   4. Classify outliers as STRONG (5x+) or STANDARD (2.5x–5x).
 *   5. Enrich each outlier with a hook_type classification based on
 *      title pattern analysis (curiosity gap, list, contrarian, etc.)
 *      so the AI can reference the pattern, not just the title.
 *
 * WHY VIEWS-PER-HOUR AND NOT RAW VIEWS
 * ------------------------------------
 * The original scoring was `viewCount / channelMedianViews`, which ignored
 * how old each video was — the code computed ageInDays and then never used
 * it in the score. Because views only accumulate, that systematically
 * ranked old videos above new ones:
 *
 *   - A 28-day-old video at 3x the channel median scored 3.0x and shipped.
 *   - A 12-hour-old video already pulling 5x the channel's normal *rate*
 *     scored ~0.1x on raw views and was filtered out before the AI saw it.
 *
 * That is backwards for a product whose entire promise is telling a creator
 * what is blowing up in their niche *this morning*. Normalizing by age
 * measures velocity instead of accumulation, so a genuine breakout surfaces
 * on day one rather than three weeks later.
 *
 * KNOWN LIMITATION (worth fixing once video_snapshots has history)
 * ---------------------------------------------------------------
 * Lifetime VPH is not a perfect correction. Real videos front-load their
 * views and then plateau, so an old video's lifetime average VPH is dragged
 * down by its long flat tail. Comparing a 2-day-old video's VPH against a
 * 25-day-old video's VPH therefore tilts slightly toward the young one —
 * the opposite of the old bias, but milder and in the direction the product
 * actually wants.
 *
 * MIN_AGE_HOURS blunts the worst of it by refusing to extrapolate wild
 * rates from videos that have barely been up. The real fix is to compare
 * views-at-age-T against the channel's typical views-at-age-T, which needs
 * the time series the video_snapshots table is designed to hold. Once that
 * table has a few weeks of history, revisit this.
 */

export type RawCompetitorVideo = {
  id: string;
  title: string;
  viewCount: number;
  publishedAt: string;
  thumbnailUrl?: string;
  channel: string;
};

export type OutlierVideo = RawCompetitorVideo & {
  channelMedian: number;       // median RAW views — kept for human display
  channelMedianVph: number;    // median views-per-hour — the scoring baseline
  viewsPerHour: number;        // this video's views-per-hour
  outlierScore: number;        // viewsPerHour / channelMedianVph
  outlierTier: 'super' | 'strong' | 'standard';  // 10x+ / 5x+ / 2.5x+
  hookType: string;            // detected hook pattern
  ageInDays: number;           // how old the video is
};

// Minimum multiplier above the channel's normal pace to count as an outlier
const OUTLIER_THRESHOLD = 2.5;

/**
 * Treat any video younger than this as if it were exactly this old.
 *
 * Without a floor, a video posted 40 minutes ago with 300 views computes to
 * 450 views/hour and lands as a "super outlier" off almost no signal. Twelve
 * hours is long enough for a real breakout to separate from noise while
 * still catching same-day movers — which matters, because this feeds a
 * brief a creator reads in the morning about yesterday.
 */
const MIN_AGE_HOURS = 12;

/**
 * Ceiling on the reported multiplier.
 *
 * A channel whose median pace is near zero (a dormant channel that just
 * posted) can otherwise produce scores in the thousands, which crowds out
 * genuinely interesting videos in the prompt's top-8 and reads as broken.
 */
const MAX_OUTLIER_SCORE = 50;

/** Views per hour, with young videos floored to avoid extrapolating noise. */
function viewsPerHour(viewCount: number, publishedAt: string, now: number): number | null {
  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedMs)) return null;

  const ageHours = (now - publishedMs) / (60 * 60 * 1000);
  if (ageHours < 0) return null; // scheduled/premiere with a future timestamp

  return viewCount / Math.max(ageHours, MIN_AGE_HOURS);
}

/**
 * Calculate the median of an array of numbers.
 * More robust than mean for skewed distributions (one viral hit won't
 * inflate the baseline for a small channel).
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Classify the hook type of a video title using pattern matching.
 * Returns a short label that the AI can reference when explaining
 * why a video worked.
 *
 * Patterns are ordered by specificity — more specific patterns first.
 */
export function classifyHookType(title: string): string {
  const t = title.toLowerCase();

  // Curiosity gap / open loop
  if (/why (i|we|you|they|nobody|everyone)/.test(t)) return 'curiosity-gap';
  if (/what (happens|happened|if|nobody|everyone)/.test(t)) return 'curiosity-gap';
  if (/the (truth|secret|real reason|dark side|hidden)/.test(t)) return 'reveal';
  if (/\bexposed\b|\brevealed\b|\bunmasked\b/.test(t)) return 'reveal';

  // Contrarian / counter-narrative
  if (/\bstop\b.*(doing|using|buying|watching)/.test(t)) return 'contrarian';
  if (/\bwrong\b|\bmistake(s)?\b|\blie(s)?\b/.test(t)) return 'contrarian';
  if (/\boverrated\b|\bwaste\b|\bscam\b/.test(t)) return 'contrarian';
  if (/\bnobody tells you\b|\bthey don'?t want\b/.test(t)) return 'contrarian';

  // Authority / credibility
  if (/\b(years?|months?|hours?|days?) (of|later|ago)\b/.test(t)) return 'authority-time';
  if (/\bprofessional\b|\bexpert\b|\bpro\b/.test(t)) return 'authority';
  if (/\bi (tried|tested|spent|used|built|made)\b/.test(t)) return 'first-person-experiment';

  // List / number
  if (/^\d+\s/.test(t) || /\b\d+\s+(ways?|tips?|tricks?|things?|reasons?|steps?|mistakes?|tools?|hacks?)\b/.test(t)) return 'numbered-list';

  // Comparison / versus
  if (/\bvs\.?\b|\bversus\b|\bor\b.*\bwhich\b|\bcompared?\b/.test(t)) return 'comparison';

  // How-to / tutorial
  if (/^how (to|i|we)\b/.test(t)) return 'how-to';
  if (/\btutorial\b|\bguide\b|\bstep.by.step\b/.test(t)) return 'tutorial';

  // Transformation / result
  if (/\bbefore (and|&) after\b/.test(t)) return 'transformation';
  if (/\b(went|grew|made|earned|lost|gained)\b.*(from|to|\$|k|m)\b/.test(t)) return 'result-story';

  // Urgency / FOMO
  if (/\bdon'?t\b.*(miss|skip|ignore|wait)\b/.test(t)) return 'urgency';
  if (/\bwhile you (still|can)\b|\bbefore it'?s (too late|gone)\b/.test(t)) return 'urgency';

  // Challenge / reaction
  if (/\bchallenge\b|\breaction\b|\breacting\b/.test(t)) return 'challenge-reaction';

  // Story / narrative
  if (/\bstory\b|\bconfession\b|\bhonest\b|\breal talk\b/.test(t)) return 'story';

  return 'general';
}

/**
 * Given a flat list of competitor videos (from multiple channels),
 * calculate outlier scores per channel and return only the outliers,
 * sorted by outlier score descending.
 *
 * @param videos - All recent videos from all tracked competitor channels
 * @param threshold - Minimum outlier score (default 2.5x channel median)
 * @param maxAgeDays - Only consider videos published within this many days (default 30)
 */
export function detectOutliers(
  videos: RawCompetitorVideo[],
  threshold = OUTLIER_THRESHOLD,
  maxAgeDays = 30
): OutlierVideo[] {
  if (videos.length === 0) return [];

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  // Group videos by channel
  const byChannel = new Map<string, RawCompetitorVideo[]>();
  for (const v of videos) {
    if (!byChannel.has(v.channel)) byChannel.set(v.channel, []);
    byChannel.get(v.channel)!.push(v);
  }

  const outliers: OutlierVideo[] = [];

  for (const [, channelVideos] of byChannel) {
    // Need at least 3 videos to establish a meaningful baseline
    if (channelVideos.length < 3) continue;

    // Baseline is the channel's normal PACE, not its normal total.
    const vphByVideo = new Map<string, number>();
    for (const v of channelVideos) {
      const vph = viewsPerHour(v.viewCount, v.publishedAt, now);
      if (vph !== null) vphByVideo.set(v.id, vph);
    }

    // A baseline built from one or two videos is noise, not a baseline.
    if (vphByVideo.size < 3) continue;

    const channelMedianVph = median([...vphByVideo.values()]);
    const channelMedian = median(channelVideos.map((v) => v.viewCount));

    // Dormant channel with no measurable pace — nothing to compare against.
    if (channelMedianVph <= 0) continue;

    for (const v of channelVideos) {
      const publishedMs = new Date(v.publishedAt).getTime();
      if (!Number.isFinite(publishedMs)) continue;

      // Skip videos older than maxAgeDays
      if (now - publishedMs > maxAgeMs) continue;

      const vph = vphByVideo.get(v.id);
      if (vph === undefined) continue;

      const ageInDays = Math.floor((now - publishedMs) / (24 * 60 * 60 * 1000));
      const outlierScore = Math.min(vph / channelMedianVph, MAX_OUTLIER_SCORE);

      if (outlierScore >= threshold) {
        const outlierTier: OutlierVideo['outlierTier'] =
          outlierScore >= 10 ? 'super' :
          outlierScore >= 5  ? 'strong' :
          'standard';

        outliers.push({
          ...v,
          channelMedian,
          channelMedianVph,
          viewsPerHour: vph,
          outlierScore,
          outlierTier,
          hookType: classifyHookType(v.title),
          ageInDays,
        });
      }
    }
  }

  // Sort: super outliers first, then by score descending
  outliers.sort((a, b) => {
    const tierOrder = { super: 0, strong: 1, standard: 2 };
    const tierDiff = tierOrder[a.outlierTier] - tierOrder[b.outlierTier];
    if (tierDiff !== 0) return tierDiff;
    return b.outlierScore - a.outlierScore;
  });

  return outliers;
}

/**
 * Format outlier data as a compact text block for injection into the AI prompt.
 * This replaces the raw "here are all competitor videos" dump with a curated,
 * pre-analyzed list that tells the AI exactly what's working and why.
 */
export function formatOutliersForPrompt(outliers: OutlierVideo[]): string {
  if (outliers.length === 0) {
    return '  (no outlier videos detected in tracked channels — all videos performing near channel average)';
  }

  return outliers
    .slice(0, 8) // Cap at 8 to keep prompt focused
    .map((v) => {
      // Say "pace" rather than "avg": the score is a velocity multiple, and
      // the AI is asked to explain WHY a video worked. Telling it the video
      // did 4x the channel's normal *rate* is a different and more accurate
      // claim than 4x its normal view count.
      const scoreLabel =
        v.outlierTier === 'super'   ? `🔥 SUPER OUTLIER (${v.outlierScore.toFixed(1)}x channel pace)` :
        v.outlierTier === 'strong'  ? `⚡ STRONG OUTLIER (${v.outlierScore.toFixed(1)}x channel pace)` :
        `📈 OUTLIER (${v.outlierScore.toFixed(1)}x channel pace)`;

      const pace = `${Math.round(v.viewsPerHour).toLocaleString()}/hr vs channel norm ${Math.round(v.channelMedianVph).toLocaleString()}/hr`;

      return [
        `  [${v.channel}] "${v.title}"`,
        `    ${scoreLabel} | ${v.viewCount.toLocaleString()} views | ${v.ageInDays}d ago`,
        `    Pace: ${pace}`,
        `    Hook type: ${v.hookType} | Channel median: ${v.channelMedian.toLocaleString()} views`,
        `    Video ID: ${v.id}`,
      ].join('\n');
    })
    .join('\n\n');
}

/**
 * Also compute the creator's own outlier videos (their personal top performers
 * relative to their own baseline). Used to detect what formats work for THEM.
 */
export type OwnOutlier = {
  title: string;
  views: number;
  ownMedian: number;
  outlierScore: number;
  hookType: string;
  posted_at: string;
};

export function detectOwnOutliers(
  videos: Array<{ title: string; views: number; posted_at: string }>,
  threshold = 2.0
): OwnOutlier[] {
  if (videos.length < 3) return [];

  const now = Date.now();
  const ownMedian = median(videos.map((v) => v.views));
  if (ownMedian === 0) return [];

  // Same age-normalization as the competitor path — but gracefully degraded.
  //
  // gatherUserContext() reads posted_at out of a JSON performance blob and
  // falls back to '' when it is missing, so a creator's imported library can
  // legitimately arrive with no usable dates. Rather than return nothing in
  // that case, fall back to the raw-views ratio: less accurate, but a stale
  // signal beats an empty brief.
  const vphByIndex = new Map<number, number>();
  videos.forEach((v, i) => {
    const vph = viewsPerHour(v.views, v.posted_at, now);
    if (vph !== null) vphByIndex.set(i, vph);
  });

  const canUseVph = vphByIndex.size >= 3;
  const ownMedianVph = canUseVph ? median([...vphByIndex.values()]) : 0;

  return videos
    .map((v, i) => {
      const vph = vphByIndex.get(i);
      const score =
        canUseVph && ownMedianVph > 0 && vph !== undefined
          ? Math.min(vph / ownMedianVph, MAX_OUTLIER_SCORE)
          : v.views / ownMedian;

      return {
        ...v,
        ownMedian,
        outlierScore: score,
        hookType: classifyHookType(v.title),
      };
    })
    .filter((v) => v.outlierScore >= threshold)
    .sort((a, b) => b.outlierScore - a.outlierScore);
}
