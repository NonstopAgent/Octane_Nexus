import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  fetchYouTubeVideos,
  refreshAccessToken,
  getServiceRoleClient,
} from '@/lib/youtubeOAuth';
import { storeArtifact } from '@/lib/creatorMemory';

export const dynamic = 'force-dynamic';

/**
 * POST /api/youtube/import
 * Pulls the user's most recent YouTube videos and stores them as
 * creator_artifacts with performance data (view counts, likes).
 * These artifacts immediately become context for Nexus Chat.
 */
export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getServiceRoleClient();

    // Find the user's YouTube connection
    const { data: connection, error: connErr } = await admin
      .from('creator_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'youtube')
      .maybeSingle();

    if (connErr || !connection) {
      return NextResponse.json(
        { error: 'No YouTube connection found. Connect first.' },
        { status: 400 }
      );
    }

    // Refresh the access token if it's expired (or within 60s of expiring)
    let accessToken = connection.access_token as string;
    const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
    if (expiresAt - Date.now() < 60_000) {
      if (!connection.refresh_token) {
        return NextResponse.json(
          { error: 'Access token expired and no refresh token available. Reconnect YouTube.' },
          { status: 401 }
        );
      }
      try {
        const refreshed = await refreshAccessToken(connection.refresh_token as string);
        accessToken = refreshed.access_token;
        await admin
          .from('creator_connections')
          .update({
            access_token: refreshed.access_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          })
          .eq('id', connection.id);
      } catch (refreshErr) {
        console.error('youtube/import refresh failed:', refreshErr);
        return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
      }
    }

    // Fetch the user's recent videos
    const videos = await fetchYouTubeVideos(accessToken, 50);
    if (videos.length === 0) {
      await admin
        .from('creator_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connection.id);
      return NextResponse.json({ imported: 0, message: 'No videos found on this channel' });
    }

    // Check which videos are already imported (by metadata.youtube_video_id)
    const { data: existing } = await admin
      .from('creator_artifacts')
      .select('id, metadata')
      .eq('user_id', user.id)
      .eq('source', 'imported_youtube');

    const existingIds = new Set(
      (existing || [])
        .map((a) => (a.metadata as { youtube_video_id?: string })?.youtube_video_id)
        .filter(Boolean)
    );

    // Store each new video as a 'post' artifact with performance data
    let imported = 0;
    for (const video of videos) {
      if (existingIds.has(video.id)) continue;
      const stored = await storeArtifact(admin, user.id, {
        artifact_type: 'post',
        title: video.title,
        content: video.description || video.title,
        platform: 'youtube',
        source: 'imported_youtube',
        performance: {
          views: video.viewCount,
          likes: video.likeCount,
          comments: video.commentCount,
          posted_at: video.publishedAt,
        },
        metadata: {
          youtube_video_id: video.id,
          thumbnail_url: video.thumbnailUrl,
          duration: video.duration,
          url: `https://www.youtube.com/watch?v=${video.id}`,
        },
      });
      if (stored) imported++;
    }

    // Update last sync timestamp
    await admin
      .from('creator_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
      })
      .eq('id', connection.id);

    return NextResponse.json({
      imported,
      skipped: videos.length - imported,
      total: videos.length,
      channel: connection.provider_display_name,
    });
  } catch (err) {
    console.error('youtube/import error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 }
    );
  }
}
