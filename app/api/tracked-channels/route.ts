import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { fetchPublicChannelVideos, getValidYouTubeAccessToken } from '@/lib/youtubeOAuth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/tracked-channels
 * List the user's tracked competitor channels with their cached recent videos.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('tracked_channels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ channels: data || [] });
  } catch (err) {
    console.error('GET /api/tracked-channels error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

const FREE_TIER_CHANNEL_LIMIT = 3;

/**
 * POST /api/tracked-channels
 * Body: { youtube_channel_id, channel_title, channel_handle?, thumbnail_url?, subscriber_count? }
 *
 * Adds a competitor channel and immediately fetches its 10 most recent videos
 * so the brief generator has data to work with right away.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const youtube_channel_id = typeof body.youtube_channel_id === 'string' ? body.youtube_channel_id.trim() : '';
    const channel_title = typeof body.channel_title === 'string' ? body.channel_title.trim() : '';
    if (!youtube_channel_id || !channel_title) {
      return NextResponse.json({ error: 'youtube_channel_id and channel_title are required' }, { status: 400 });
    }

    // Enforce free tier limit (until payments are wired)
    const { count } = await supabase
      .from('tracked_channels')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count || 0) >= FREE_TIER_CHANNEL_LIMIT) {
      return NextResponse.json(
        { error: `Free tier supports up to ${FREE_TIER_CHANNEL_LIMIT} tracked channels. Remove one or upgrade.` },
        { status: 402 }
      );
    }

    // Fetch the channel's recent videos so the first brief has real data.
    // Use the user's YouTube OAuth token if available — no dependency on the
    // shared YOUTUBE_API_KEY that has historically expired silently.
    let recentVideos: Array<{
      id: string;
      title: string;
      viewCount: number;
      publishedAt: string;
      thumbnailUrl: string;
    }> = [];
    try {
      const admin = createServiceRoleClient();
      const accessToken = await getValidYouTubeAccessToken(admin, user.id);
      const videos = await fetchPublicChannelVideos(
        youtube_channel_id,
        10,
        accessToken ?? undefined
      );
      recentVideos = videos.map((v) => ({
        id: v.id,
        title: v.title,
        viewCount: v.viewCount,
        publishedAt: v.publishedAt,
        thumbnailUrl: v.thumbnailUrl,
      }));
    } catch (fetchErr) {
      console.warn('tracked-channels POST: failed to fetch initial videos', fetchErr);
      // non-fatal — we'll still add the channel, the cron job will populate it
    }

    const channel_handle =
      typeof body.channel_handle === 'string' ? body.channel_handle.trim() || null : null;
    const thumbnail_url =
      typeof body.thumbnail_url === 'string' ? body.thumbnail_url.trim() || null : null;
    const subscriber_count =
      typeof body.subscriber_count === 'number' && Number.isFinite(body.subscriber_count)
        ? Math.floor(body.subscriber_count)
        : null;

    const { data: row, error: insertError } = await supabase
      .from('tracked_channels')
      .insert({
        user_id: user.id,
        youtube_channel_id,
        channel_title,
        channel_handle,
        thumbnail_url,
        subscriber_count,
        recent_videos: recentVideos,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Channel already tracked' }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ channel: row });
  } catch (err) {
    console.error('POST /api/tracked-channels error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tracked-channels?id=<uuid>
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tracked_channels')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/tracked-channels error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
