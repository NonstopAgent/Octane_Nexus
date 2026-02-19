import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const summary = { postsThisWeek: 0, scheduled: 0, posted: 0, streak: 0 };

    try {
      const { data: profile } = await db
        .from('profiles')
        .select('streak_count')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.streak_count != null) {
        summary.streak = Number(profile.streak_count) || 0;
      }
    } catch {
      // profiles may not exist for demo user
    }

    try {
      const { data: posts } = await db
        .from('content_posts')
        .select('status, posted_at, created_at')
        .eq('user_id', userId);

      if (Array.isArray(posts)) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        for (const p of posts) {
          const status = (p?.status as string) || '';
          if (status === 'scheduled') summary.scheduled++;
          if (status === 'posted') summary.posted++;
          const postedAt = p?.posted_at ? new Date(p.posted_at as string) : null;
          const createdAt = p?.created_at ? new Date(p.created_at as string) : null;
          const refDate = postedAt ?? createdAt;
          if (status === 'posted' && refDate && refDate >= weekAgo) summary.postsThisWeek++;
        }
      }
    } catch {
      // Table may not exist in demo mode without DB
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error('monitoring/summary error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
