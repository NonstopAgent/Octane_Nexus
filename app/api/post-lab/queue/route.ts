import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { POST_LAB_STATUSES } from '@/lib/postStatus';
import { resolvePostVideoFields } from '@/lib/media-resolver';

/**
 * GET: Post Lab queue — content_posts with status in (filming, ready).
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
      .select('*')
      .eq('user_id', userId)
      .in('status', [...POST_LAB_STATUSES])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('post-lab/queue error:', error);
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

    return NextResponse.json(posts ?? []);
  } catch (e) {
    console.error('post-lab/queue error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
