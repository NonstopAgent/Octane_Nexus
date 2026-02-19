import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { POST_STATUS } from '@/lib/postStatus';

/**
 * POST: Create a draft/idea for Post Lab. Body: { title?, script_content? }.
 * Enforces user_id = effectiveUserId. Service role for demo.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title =
      typeof body?.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, 500)
        : 'New draft';
    const script_content =
      body?.script_content && typeof body.script_content === 'object'
        ? body.script_content
        : null;
    const status =
      body?.status === POST_STATUS.FILMING || body?.status === POST_STATUS.READY || body?.status === POST_STATUS.SCRIPTING || body?.status === POST_STATUS.IDEA
        ? body.status
        : POST_STATUS.SCRIPTING;

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await db
      .from('content_posts')
      .insert({
        user_id: userId,
        title,
        script_content: script_content ?? { hook: title },
        status,
      })
      .select('id, title, script_content, status, user_id, created_at, updated_at')
      .single();

    if (error) {
      console.error('post-lab/create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('post-lab/create error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
