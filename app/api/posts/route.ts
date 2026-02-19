import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { POST_STATUS } from '@/lib/postStatus';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = db.from('content_posts').select('*').eq('user_id', userId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('posts GET error:', error);
      return NextResponse.json({ posts: [] });
    }
    return NextResponse.json({ posts: data || [] });
  } catch (err) {
    console.error('posts GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const body = await req.json().catch(() => ({}));

    const row: Record<string, unknown> = {
      user_id: userId,
      title: body.title || body.idea_title || 'Untitled idea',
      status: body.status || POST_STATUS.IDEA,
      script_content: body.script_content || null,
      caption: body.caption || null,
      hashtags: body.hashtags || null,
      final_video_url: body.final_video_url || null,
      background_video_url: body.background_video_url || null,
      style_token_id: body.style_token_id || null,
      source_url: body.source_url || null,
      scheduled_date: body.scheduled_date || body.scheduled_at || null,
      platform: body.platform || null,
    };

    const { data, error } = await db.from('content_posts').insert(row).select().single();
    if (error) {
      console.error('posts POST insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ post: data });
  } catch (err) {
    console.error('posts POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
