import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

/**
 * GET: List metrics for a post. Query: postId=<uuid>
 * POST: Add metrics entry. Body: { postId, platform, views, likes, comments, shares, saves }
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const postId = req.nextUrl.searchParams.get('postId')?.trim();

    let query = db.from('post_metrics').select('*').eq('user_id', userId);
    if (postId) query = query.eq('post_id', postId);
    const { data, error } = await query.order('captured_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('metrics GET error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    if (!postId) return NextResponse.json({ error: 'postId is required' }, { status: 400 });

    const { data, error } = await db.from('post_metrics').insert({
      user_id: userId,
      post_id: postId,
      platform: body.platform || 'other',
      views: body.views ?? null,
      likes: body.likes ?? null,
      comments: body.comments ?? null,
      shares: body.shares ?? null,
      saves: body.saves ?? null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error('metrics POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
