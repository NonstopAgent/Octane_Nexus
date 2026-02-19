import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { listPosts } from '@/lib/postsRepo';
import { resolvePostVideoFields } from '@/lib/media-resolver';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const posts = await listPosts(db, userId);

    const service = createServiceRoleClient();
    const resolved = await Promise.all(
      posts.map(async (p) => {
        const urls = await resolvePostVideoFields(
          p.final_video_url ?? null,
          p.background_video_url ?? null,
          service
        );
        return { ...p, ...urls };
      })
    );

    return NextResponse.json(resolved);
  } catch (e) {
    console.error('production/posts error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
