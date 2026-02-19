import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { POST_STATUS } from '@/lib/postStatus';

/**
 * POST: Mark a post as posted. Body: { postId, posted_url?, posted_at? }
 * Updates status → POSTED, sets posted_url and posted_at.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    if (!postId) return NextResponse.json({ error: 'postId is required' }, { status: 400 });

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const postedAt = body.posted_at || new Date().toISOString();

    const { data, error } = await db
      .from('content_posts')
      .update({
        status: POST_STATUS.POSTED,
        posted_url: body.posted_url || null,
        posted_at: postedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId)
      .select('id, status, posted_url, posted_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(data);
  } catch (e) {
    console.error('mark-posted error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
