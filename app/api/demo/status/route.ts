import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

export const dynamic = 'force-dynamic';

/**
 * GET: Returns { seeded: boolean } for the effective user (demo or real).
 * Used by Creator page to show "Go to Production" vs "Enter Tradeview AI Demo".
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ seeded: false });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const { data: posts, error: postsErr } = await db
      .from('content_posts')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!postsErr && Array.isArray(posts) && posts.length > 0) {
      return NextResponse.json({ seeded: true });
    }

    const { data: tokens, error: tokensErr } = await db
      .from('style_tokens')
      .select('id')
      .eq('user_id', userId)
      .like('name', '[DEMO]%')
      .limit(1);

    if (!tokensErr && Array.isArray(tokens) && tokens.length > 0) {
      return NextResponse.json({ seeded: true });
    }

    return NextResponse.json({ seeded: false });
  } catch (e) {
    console.error('demo/status error:', e);
    return NextResponse.json({ seeded: false });
  }
}
