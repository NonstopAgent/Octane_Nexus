import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import type { PostStatus } from '@/lib/status';

/**
 * PATCH: Update a content_post (e.g. status for moving cards).
 * Uses service role when effective user is demo user so RLS doesn't block.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const status = typeof body?.status === 'string' ? body.status : undefined;
    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const client = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await client
      .from('content_posts')
      .update({
        status: status as PostStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('production/posts/[id] PATCH error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
