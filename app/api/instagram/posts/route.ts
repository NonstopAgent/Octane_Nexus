import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

const MEDIA_VALUES = ['image', 'video', 'carousel'] as const;
const STATUS_VALUES = ['draft', 'scheduled'] as const;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('instagram_posts')
      .select('id, media_type, media_urls, caption, hashtags, quality_score, score_breakdown, status, scheduled_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Instagram posts list error:', error);
      return NextResponse.json({ error: 'Failed to list posts' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Instagram posts GET error:', err);
    return NextResponse.json({ error: 'Failed to list posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const media_type = body.media_type as string;
    const media_urls = Array.isArray(body.media_urls) ? body.media_urls.filter((u: unknown): u is string => typeof u === 'string') : [];
    const caption = body.caption != null ? String(body.caption) : null;
    const hashtags = Array.isArray(body.hashtags) ? body.hashtags.filter((h: unknown): h is string => typeof h === 'string') : null;
    const quality_score = typeof body.quality_score === 'number' ? body.quality_score : null;
    const score_breakdown = body.score_breakdown && typeof body.score_breakdown === 'object' ? body.score_breakdown : null;
    const status = (body.status as string) || 'draft';
    const scheduled_at = body.scheduled_at != null && body.scheduled_at !== '' ? String(body.scheduled_at) : null;

    if (!media_type || !(MEDIA_VALUES as readonly string[]).includes(media_type)) {
      return NextResponse.json({ error: 'Invalid media_type' }, { status: 400 });
    }
    if (!status || !(STATUS_VALUES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (status === 'scheduled' && !scheduled_at) {
      return NextResponse.json({ error: 'scheduled_at required when status is scheduled' }, { status: 400 });
    }

    const { data: row, error } = await supabase
      .from('instagram_posts')
      .insert({
        user_id: user.id,
        media_type,
        media_urls,
        caption,
        hashtags,
        quality_score,
        score_breakdown,
        status,
        scheduled_at,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Instagram posts insert error:', error);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({ id: row.id });
  } catch (err) {
    console.error('Instagram posts POST error:', err);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
