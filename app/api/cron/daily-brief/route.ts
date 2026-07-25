import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { generateAndSaveBrief } from '@/lib/dailyBrief';
import {
  fetchPublicChannelVideos,
  getValidYouTubeAccessToken,
} from '@/lib/youtubeOAuth';
import { runFeedbackLoopForUser } from '@/lib/briefFeedback';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Refresh cached uploads for every tracked channel belonging to this user.
 * Uses the user's OAuth token (preferred) or the server YOUTUBE_API_KEY.
 */
async function refreshTrackedChannelsVideos(
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

  // Cache the user's OAuth token for the whole loop
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
 * Fetch the creator's own recent YouTube videos for the feedback loop.
 * Uses their connected YouTube channel ID from creator_connections (the
 * actual table — earlier code referenced a non-existent `connections` table).
 * Returns empty array if no YouTube connection is found (non-fatal).
 */
async function fetchCreatorRecentVideos(
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

/**
 * Calculate the creator's median view count from their imported videos.
 */
async function getCreatorMedianViews(
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

/**
 * Vercel Cron: pre-generate daily briefs for users with YouTube imports or tracked channels.
 *
 * Security / history
 * ------------------
 * This route returned 401 on every scheduled run for weeks and nothing
 * alerted, because a 401 is a "successful" HTTP response as far as Vercel's
 * cron reporting is concerned. The daily brief — the entire product — simply
 * never generated.
 *
 * The old check trusted exactly two signals and silently rejected everything
 * else. If CRON_SECRET was set or rotated in the Vercel dashboard *after* the
 * last deployment, the running function still held the old value while Vercel
 * sent the new one, so the Bearer comparison never matched and the legacy
 * `x-vercel-cron: 1` header (which Vercel no longer reliably sends) didn't
 * save it.
 *
 * Now: we accept any legitimate Vercel cron signal, and — critically — we log
 * exactly which signals were present when we reject, so a misconfiguration is
 * visible in the logs within one run instead of invisible for a month.
 */
function authorizeCron(req: NextRequest): {
  authorized: boolean;
  via: string;
  reason?: string;
} {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const vercelCronHeader = req.headers.get('x-vercel-cron');
  const userAgent = req.headers.get('user-agent') || '';
  const isVercelCronUA = /vercel-cron/i.test(userAgent);

  // Preferred path: the shared secret matches.
  if (secret && auth === `Bearer ${secret}`) {
    return { authorized: true, via: 'cron-secret' };
  }

  // Vercel-internal signals. These headers cannot be set by an external
  // caller — Vercel strips inbound x-vercel-* headers at the edge — so
  // trusting them is safe and keeps the job running through a secret
  // rotation that hasn't been redeployed yet.
  if (vercelCronHeader) {
    return { authorized: true, via: 'x-vercel-cron' };
  }
  if (isVercelCronUA) {
    return { authorized: true, via: 'vercel-cron-user-agent' };
  }

  // No secret configured and no Vercel signal: this is a manual hit.
  if (!secret) {
    return {
      authorized: false,
      via: 'none',
      reason:
        'CRON_SECRET is not set and no Vercel cron signal was present. Set CRON_SECRET in Vercel and redeploy.',
    };
  }

  return {
    authorized: false,
    via: 'none',
    reason: `CRON_SECRET is set but the Authorization header did not match (header ${
      auth ? 'present but different' : 'absent'
    }). If you changed CRON_SECRET in the Vercel dashboard, redeploy — env changes do not reach a running deployment.`,
  };
}

export async function GET(req: NextRequest) {
  const auth = authorizeCron(req);
  if (!auth.authorized) {
    // Loud on purpose. The previous silent 401 hid a total product outage.
    console.error(`[cron/daily-brief] REJECTED: ${auth.reason}`);
    return NextResponse.json(
      { error: 'Unauthorized', reason: auth.reason },
      { status: 401 }
    );
  }
  console.info(`[cron/daily-brief] authorized via ${auth.via}`);

  const admin = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: fromArtifacts } = await admin
    .from('creator_artifacts')
    .select('user_id')
    .eq('source', 'imported_youtube');

  const { data: fromTracked } = await admin.from('tracked_channels').select('user_id');

  const ids = new Set<string>();
  for (const r of fromArtifacts || []) {
    if (r.user_id) ids.add(r.user_id as string);
  }
  for (const r of fromTracked || []) {
    if (r.user_id) ids.add(r.user_id as string);
  }

  const userIds = [...ids].slice(0, 25);
  let generated = 0;
  let skipped = 0;

  let channelsRefreshed = 0;
  let channelRefreshFailed = 0;
  let feedbackMatched = 0;
  let feedbackIgnored = 0;

  for (const userId of userIds) {
    // Step 1: Refresh competitor channel videos
    const { refreshed, failed } = await refreshTrackedChannelsVideos(admin, userId);
    channelsRefreshed += refreshed;
    channelRefreshFailed += failed;

    // Step 2: Run the feedback loop BEFORE generating the new brief
    // (so today's brief benefits from yesterday's feedback)
    try {
      const creatorVideos = await fetchCreatorRecentVideos(admin, userId);
      const creatorMedian = await getCreatorMedianViews(admin, userId);

      if (creatorVideos.length > 0) {
        const feedbackResult = await runFeedbackLoopForUser(
          admin,
          userId,
          creatorVideos,
          creatorMedian
        );
        feedbackMatched += feedbackResult.matched;
        feedbackIgnored += feedbackResult.ignored;
      }
    } catch (feedbackErr) {
      // Non-fatal: feedback loop failure should not block brief generation
      console.warn(`cron: feedback loop failed for user ${userId}`, feedbackErr);
    }

    // Step 3: Generate today's brief (now powered by updated memory)
    const result = await generateAndSaveBrief(admin, userId, today);
    if (result) generated += 1;
    else skipped += 1;
  }

  const summary = {
    date: today,
    eligibleUsers: userIds.length,
    generated,
    skipped,
    channelsRefreshed,
    channelRefreshFailed,
    feedbackMatched,
    feedbackIgnored,
  };

  // Log the outcome so a run that "succeeds" with zero briefs generated is
  // visibly different from one that actually worked.
  if (userIds.length === 0) {
    console.warn('[cron/daily-brief] no eligible users — nobody has imported YouTube videos or tracked a channel');
  } else if (generated === 0) {
    console.error(`[cron/daily-brief] ran for ${userIds.length} user(s) but generated 0 briefs`, summary);
  } else {
    console.info(`[cron/daily-brief] generated ${generated}/${userIds.length} briefs`, summary);
  }

  return NextResponse.json(summary);
}
