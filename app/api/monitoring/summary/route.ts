import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { getEffectiveUserId } from '@/lib/effectiveUser';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zdvedfnpipgygvikoooa.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1EEA1MtGEqz8vWJAApQM6Q_FnjK-aaw';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await supabase.auth.getUser();
    const demoHeader = req.headers.get('x-demo-mode') === 'true';
    const demoCookie = req.cookies.get('octane_demo_mode')?.value === 'true';
    const effectiveUserId = getEffectiveUserId(user?.id ?? null) ?? (demoHeader || demoCookie ? 'demo_user_mvp_v1' : null);

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Summary cards: posts this week, scheduled, posted, streak
    let summary = {
      postsThisWeek: 0,
      scheduled: 0,
      posted: 0,
      streak: 0,
    };

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_count')
        .eq('id', effectiveUserId)
        .maybeSingle();

      if (profile?.streak_count != null) {
        summary.streak = Number(profile.streak_count) || 0;
      }
    } catch {
      // ignore
    }

    try {
      const { data: posts } = await supabase
        .from('content_posts')
        .select('status, created_at, scheduled_at')
        .eq('user_id', effectiveUserId);

      if (Array.isArray(posts)) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        for (const p of posts) {
          const status = (p?.status as string) || '';
          const createdAt = p?.created_at ? new Date(p.created_at) : null;
          if (status === 'scheduled') summary.scheduled++;
          if (status === 'posted') summary.posted++;
          if (createdAt && createdAt >= weekAgo) summary.postsThisWeek++;
        }
      }
    } catch {
      // content_posts may not exist; use demo mock
      if (effectiveUserId === 'demo_user_mvp_v1') {
        summary = { postsThisWeek: 3, scheduled: 2, posted: 5, streak: 7 };
      }
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error('monitoring/summary error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
