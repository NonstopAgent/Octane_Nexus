/**
 * Brief Feedback Loop
 * ===================
 * The engine that makes Octane Nexus smarter every day.
 *
 * How it works:
 *   1. Every night, the cron job calls runFeedbackLoop() for each user.
 *   2. It fetches all unresolved brief_suggestions (ideas we suggested
 *      but haven't yet checked on).
 *   3. For each suggestion, it fetches the creator's latest YouTube videos
 *      via the API and checks if any title is semantically similar to
 *      what we suggested (using keyword overlap, not exact match).
 *   4. If a match is found:
 *      - Records the actual video ID, title, and view count
 *      - Scores the outcome: 1 if views > channel median, 0 if below
 *   5. If no match is found after 7 days, marks it as ignored (-1).
 *   6. Updates creator_brief_profile with aggregated learnings:
 *      - Which hook types led to filmed videos
 *      - Which formats the creator actually uses
 *      - Running accuracy score
 *      - Plain-English AI memory summary
 *
 * This creates a data flywheel: the more a creator uses Octane Nexus,
 * the more personalized and accurate the briefs become. Competitors
 * cannot replicate this because the data is user-specific and proprietary.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type BriefSuggestion = {
  id: string;
  user_id: string;
  brief_date: string;
  suggested_title: string;
  suggested_hook: string | null;
  suggested_format: string | null;
  hook_type: string | null;
  source_channel: string | null;
  outcome: number | null;
  created_at: string;
};

type YouTubeVideoBasic = {
  id: string;
  title: string;
  viewCount: number;
  publishedAt: string;
};

/**
 * Calculate title similarity score between a suggested title and an actual title.
 * Uses word overlap (Jaccard similarity on word sets) — fast and good enough
 * for detecting "did they film a video about this topic?"
 *
 * Returns a score between 0 and 1. Threshold of 0.25 catches most matches
 * while avoiding false positives.
 */
function titleSimilarity(suggested: string, actual: string): number {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3); // ignore short words like "the", "and", "for"

  const suggestedWords = new Set(normalize(suggested));
  const actualWords = new Set(normalize(actual));

  if (suggestedWords.size === 0 || actualWords.size === 0) return 0;

  let intersection = 0;
  for (const word of suggestedWords) {
    if (actualWords.has(word)) intersection++;
  }

  const union = suggestedWords.size + actualWords.size - intersection;
  return intersection / union;
}

const SIMILARITY_THRESHOLD = 0.25;
const IGNORE_AFTER_DAYS = 7; // Mark as ignored if not filmed within 7 days

/**
 * Check a single brief suggestion against the creator's recent YouTube uploads.
 * Returns the matched video if found, or null.
 */
function findMatchingVideo(
  suggestion: BriefSuggestion,
  recentVideos: YouTubeVideoBasic[]
): YouTubeVideoBasic | null {
  let bestMatch: YouTubeVideoBasic | null = null;
  let bestScore = SIMILARITY_THRESHOLD;

  for (const video of recentVideos) {
    // Only check videos published AFTER the suggestion was made
    const videoDate = new Date(video.publishedAt);
    const suggestionDate = new Date(suggestion.created_at);
    if (videoDate <= suggestionDate) continue;

    const score = titleSimilarity(suggestion.suggested_title, video.title);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = video;
    }
  }

  return bestMatch;
}

/**
 * Update the creator_brief_profile with aggregated learnings from all
 * resolved suggestions. This is the "write" step of the feedback loop.
 */
async function updateCreatorProfile(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  // Fetch all resolved suggestions for this user
  const { data: resolved } = await admin
    .from('brief_suggestions')
    .select('hook_type, suggested_format, outcome, suggested_title')
    .eq('user_id', userId)
    .not('outcome', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50); // Look at last 50 suggestions max

  if (!resolved || resolved.length === 0) return;

  const filmed = resolved.filter((s) => s.outcome === 1 || s.outcome === 0);
  const ignored = resolved.filter((s) => s.outcome === -1);
  const successful = resolved.filter((s) => s.outcome === 1);

  // Count hook types and formats for filmed vs ignored
  const hookFilmedCount = new Map<string, number>();
  const hookIgnoredCount = new Map<string, number>();
  const formatFilmedCount = new Map<string, number>();
  const formatIgnoredCount = new Map<string, number>();

  for (const s of filmed) {
    if (s.hook_type) hookFilmedCount.set(s.hook_type, (hookFilmedCount.get(s.hook_type) || 0) + 1);
    if (s.suggested_format) formatFilmedCount.set(s.suggested_format, (formatFilmedCount.get(s.suggested_format) || 0) + 1);
  }
  for (const s of ignored) {
    if (s.hook_type) hookIgnoredCount.set(s.hook_type, (hookIgnoredCount.get(s.hook_type) || 0) + 1);
    if (s.suggested_format) formatIgnoredCount.set(s.suggested_format, (formatIgnoredCount.get(s.suggested_format) || 0) + 1);
  }

  // Winning: filmed more than ignored
  const winningHookTypes = [...hookFilmedCount.entries()]
    .filter(([type, count]) => count > (hookIgnoredCount.get(type) || 0))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  const winningFormats = [...formatFilmedCount.entries()]
    .filter(([fmt, count]) => count > (formatIgnoredCount.get(fmt) || 0))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([fmt]) => fmt);

  // Ignored: ignored more than filmed
  const ignoredHookTypes = [...hookIgnoredCount.entries()]
    .filter(([type, count]) => count > (hookFilmedCount.get(type) || 0) * 2) // 2x more ignored than filmed
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  const ignoredFormats = [...formatIgnoredCount.entries()]
    .filter(([fmt, count]) => count > (formatFilmedCount.get(fmt) || 0) * 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([fmt]) => fmt);

  // All used idea titles (to prevent repetition)
  const usedTitles = resolved.map((s) => s.suggested_title).slice(0, 20);

  // Accuracy score
  const accuracyScore = resolved.length > 0 ? filmed.length / resolved.length : 0;

  // Build the plain-English AI memory summary
  const summaryParts: string[] = [];

  if (winningHookTypes.length > 0) {
    summaryParts.push(`This creator responds best to ${winningHookTypes.join(' and ')} style hooks`);
  }
  if (winningFormats.length > 0) {
    summaryParts.push(`they prefer ${winningFormats.join(' and ')} video formats`);
  }
  if (ignoredHookTypes.length > 0) {
    summaryParts.push(`they consistently ignore ${ignoredHookTypes.join(' and ')} style suggestions`);
  }
  if (successful.length > 0) {
    summaryParts.push(`${successful.length} of our past suggestions performed above their channel average`);
  }

  const aiMemorySummary = summaryParts.length > 0
    ? summaryParts.join('; ') + '.'
    : '';

  // Upsert the profile
  const { error } = await admin
    .from('creator_brief_profile')
    .upsert({
      user_id: userId,
      winning_hook_types: winningHookTypes,
      winning_formats: winningFormats,
      ignored_hook_types: ignoredHookTypes,
      ignored_formats: ignoredFormats,
      used_idea_titles: usedTitles,
      ai_memory_summary: aiMemorySummary,
      total_suggestions: resolved.length,
      total_filmed: filmed.length,
      total_ignored: ignored.length,
      accuracy_score: Math.round(accuracyScore * 100) / 100,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.warn('briefFeedback.updateCreatorProfile: upsert failed', error.message);
  }
}

/**
 * Run the feedback loop for a single user.
 *
 * @param admin - Supabase service role client
 * @param userId - The creator's user ID
 * @param recentVideos - The creator's recent YouTube uploads (fetched by caller)
 * @param channelMedianViews - The creator's own median view count (for scoring outcome)
 */
export async function runFeedbackLoopForUser(
  admin: SupabaseClient,
  userId: string,
  recentVideos: YouTubeVideoBasic[],
  channelMedianViews: number
): Promise<{ checked: number; matched: number; ignored: number }> {
  // Fetch pending suggestions (no outcome yet)
  const { data: pending } = await admin
    .from('brief_suggestions')
    .select('*')
    .eq('user_id', userId)
    .is('outcome', null)
    .order('brief_date', { ascending: true })
    .limit(20);

  if (!pending || pending.length === 0) {
    return { checked: 0, matched: 0, ignored: 0 };
  }

  const now = new Date();
  let matched = 0;
  let ignored = 0;

  for (const suggestion of pending as BriefSuggestion[]) {
    const suggestionAge = Math.floor(
      (now.getTime() - new Date(suggestion.created_at).getTime()) / (24 * 60 * 60 * 1000)
    );

    const matchedVideo = findMatchingVideo(suggestion, recentVideos);

    if (matchedVideo) {
      // Creator filmed a video matching our suggestion
      const outcome = matchedVideo.viewCount >= channelMedianViews ? 1 : 0;

      await admin
        .from('brief_suggestions')
        .update({
          filmed_video_id: matchedVideo.id,
          filmed_video_title: matchedVideo.title,
          filmed_view_count: matchedVideo.viewCount,
          filmed_at: matchedVideo.publishedAt,
          outcome,
          outcome_checked_at: now.toISOString(),
        })
        .eq('id', suggestion.id);

      matched++;
    } else if (suggestionAge >= IGNORE_AFTER_DAYS) {
      // Not filmed within the window — mark as ignored
      await admin
        .from('brief_suggestions')
        .update({
          outcome: -1,
          outcome_checked_at: now.toISOString(),
        })
        .eq('id', suggestion.id);

      ignored++;
    }
    // else: still within the window, leave as pending
  }

  // After resolving suggestions, update the creator's profile
  if (matched > 0 || ignored > 0) {
    await updateCreatorProfile(admin, userId);
  }

  return { checked: pending.length, matched, ignored };
}
