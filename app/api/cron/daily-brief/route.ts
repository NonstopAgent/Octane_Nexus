import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { generateAndSaveBrief } from '@/lib/dailyBrief';
import { fetchPublicChannelVideos } from '@/lib/youtubeOAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Refresh cached uploads for every tracked channel belonging to this user.
 * Uses the public YouTube API key (same as search / initial track).
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

  let refreshed = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    try {
      const videos = await fetchPublicChannelVideos(row.youtube_channel_id, 10);
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
 * Vercel Cron: pre-generate daily briefs for users with YouTube imports or tracked channels.
 *
 * Security: set CRON_SECRET in Vercel project env. Vercel Cron sends
 *   Authorization: Bearer <CRON_SECRET>
 * when that variable is configured.
 */
function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth === `Bearer ${secret}`) return true;
  }
  if (req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  for (const userId of userIds) {
    const { refreshed, failed } = await refreshTrackedChannelsVideos(admin, userId);
    channelsRefreshed += refreshed;
    channelRefreshFailed += failed;

    const result = await generateAndSaveBrief(admin, userId, today);
    if (result) generated += 1;
    else skipped += 1;
  }

  return NextResponse.json({
    date: today,
    eligibleUsers: userIds.length,
    generated,
    skipped,
    channelsRefreshed,
    channelRefreshFailed,
  });
}
