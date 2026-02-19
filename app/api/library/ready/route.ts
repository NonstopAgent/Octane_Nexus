import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { POST_STATUS } from '@/lib/postStatus';
import { resolvePostVideoFields } from '@/lib/media-resolver';

/**
 * GET: List content_posts for effective user with status READY.
 * Returns final_video_path + final_video_url (signed), background_video_path + background_video_url (signed).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await db
      .from('content_posts')
      .select('id, title, script_content, caption, hashtags, final_video_url, background_video_url, status, created_at, updated_at')
      .eq('user_id', userId)
      .eq('status', POST_STATUS.READY)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('library/ready error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const service = createServiceRoleClient();
    const posts = await Promise.all((data ?? []).map(async (p: Record<string, unknown>) => {
      const resolved = await resolvePostVideoFields(
        (p.final_video_url as string) ?? null,
        (p.background_video_url as string) ?? null,
        service
      );
      return { ...p, ...resolved };
    }));

    return NextResponse.json(posts);
  } catch (e) {
    console.error('library/ready error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
