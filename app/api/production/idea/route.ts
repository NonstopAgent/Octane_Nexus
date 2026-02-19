import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { createPost } from '@/lib/postsRepo';
import { POST_STATUS } from '@/lib/postStatus';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const post = await createPost(db, userId, { title, status: POST_STATUS.IDEA });

    if (!post) return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 });
    return NextResponse.json({ id: post.id });
  } catch (e) {
    console.error('production/idea error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
