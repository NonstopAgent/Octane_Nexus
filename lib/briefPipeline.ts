import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAndSaveBrief } from '@/lib/dailyBrief';
import {
  fetchPublicChannelVideos,
  getValidYouTubeAccessToken,
} from '@/lib/youtubeOAuth';
import { runFeedbackLoopForUser } from '@/lib/briefFeedback';

/**
 * Everything needed to produce one user's brief.
 *
 * This used to live inline in the daily-brief cron route, wrapped in a loop
 * over every user. It is per-user now so the queue worker can run it for one
 * job at a time and retry that job alone when it fails.
 */

/** Refresh cached uploads for every tracked channel belonging to this user. */
export async function refreshTrackedChannelsVideos(
  admin: SupabaseClient,
  userId: string
): Promise<{ refreshed: number; failed: number }> {
  const { data: rows, error } = await admin
    .from('tracked_channels')
    .select('id, youtube_channel_id')
    .eq('user_id', userId);

  if (error || !rows?.length) {
    return { refreshed: 0, failed: 0 };
  }

  const accessToken = (await getValidYouTubeAccessToken(admin, userId)) ?? undefined;

  let refreshed = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    try {
      const videos = await fetchPublicChannelVideos(
        row.youtube_channel_id,
        10,
        accessToken
      );
      const recentVideos = videos.map((v) => ({
        id: v.id,
        title: v.title,
        viewCount: v.viewCount,
        publishedAt: v.publishedAt,
        thumbnailUrl: v.thumbnailUrl,
      }));

      const { error: upErr } = await admin
        .from('tracked_channels')
        .update({
          recent_videos: recentVideos,
          last_synced_at: now,
          updated_at: now,
        })
        .eq('id', row.id)
        .eq('user_id', userId);

      if (upErr) failed += 1;
      else refreshed += 1;
    } catch {
      failed += 1;
    }
  }

  return { refreshed, failed };
}

/**
 * The creator's own recent uploads, for the feedback loop. Uses the YouTube
 * channel stored on creator_connections. Empty array is non-fatal.
 */
export async function fetchCreatorRecentVideos(
  admin: SupabaseClient,
  userId: string
): Promise<Array<{ id: string; title: string; viewCount: number; publishedAt: string }>> {
  try {
    const { data: connection } = await admin
      .from('creator_connections')
      .select('provider_account_id')
      .eq('user_id', userId)
      .eq('provider', 'youtube')
      .maybeSingle();

    if (!connection?.provider_account_id) return [];

    const accessToken =
      (await getValidYouTubeAccessToken(admin, userId)) ?? undefined;

    const videos = await fetchPublicChannelVideos(
      connection.provider_account_id as string,
      20,
      accessToken
    );
    return videos.map((v) => ({
      id: v.id,
      title: v.title,
      viewCount: v.viewCount,
      publishedAt: v.publishedAt,
    }));
  } catch {
    return [];
  }
}

/** Median view count across the creator's imported videos. */
export async function getCreatorMedianViews(
  admin: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: artifacts } = await admin
    .from('creator_artifacts')
    .select('performance')
    .eq('user_id', userId)
    .eq('source', 'imported_youtube')
    .not('performance->views', 'is', null)
    .limit(30);

  if (!artifacts || artifacts.length < 3) return 0;

  const views = artifacts
    .map((a) => Number((a.performance as { views?: number })?.views) || 0)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (views.length === 0) return 0;

  const mid = Math.floor(views.length / 2);
  return views.length % 2 !== 0
    ? views[mid]
    : (views[mid - 1] + views[mid]) / 2;
}

export type BriefRunResult = {
  generated: boolean;
  channelsRefreshed: number;
  channelRefreshFailed: number;
  feedbackMatched: number;
  feedbackIgnored: number;
};

/**
 * Produce one user's brief end to end. Throws only on a genuine failure worth
 * retrying; a user with nothing to brief on returns generated: false.
 */
export async function runBriefForUser(
  admin: SupabaseClient,
  userId: string,
  briefDate: string
): Promise<BriefRunResult> {
  const { refreshed, failed } = await refreshTrackedChannelsVideos(admin, userId);

  let feedbackMatched = 0;
  let feedbackIgnored = 0;

  // Runs before generation so today's brief benefits from yesterday's feedback.
  // Non-fatal: a feedback failure must not cost the user their brief.
  try {
    const creatorVideos = await fetchCreatorRecentVideos(admin, userId);
    if (creatorVideos.length > 0) {
      const creatorMedian = await getCreatorMedianViews(admin, userId);
      const feedback = await runFeedbackLoopForUser(
        admin,
        userId,
        creatorVideos,
        creatorMedian
      );
      feedbackMatched = feedback.matched;
      feedbackIgnored = feedback.ignored;
    }
  } catch (err) {
    console.warn(`runBriefForUser: feedback loop failed for ${userId}`, err);
  }

  const result = await generateAndSaveBrief(admin, userId, briefDate);

  return {
    generated: Boolean(result),
    channelsRefreshed: refreshed,
    channelRefreshFailed: failed,
    feedbackMatched,
    feedbackIgnored,
  };
}
