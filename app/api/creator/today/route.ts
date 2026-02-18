import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

export type NextBestAction =
  | 'film'
  | 'finish_script'
  | 'turn_idea_into_script'
  | 'grab_trend'
  | 'review_performance';

export type CreatorTodayPayload = {
  ideasCount: number;
  scriptingCount: number;
  readyCount: number;
  scheduledCount: number;
  lastPostAt: string | null;
  streakCount: number;
  xp: number;
  hasPostedToday: boolean;
  nextBestAction: NextBestAction;
};

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

    // Parallel queries for speed
    const [ideasRes, scriptingRes, readyRes, scheduledRes, profileRes, lastPostRes] =
      await Promise.all([
        db
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'idea'),
        db
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'scripting'),
        db
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('status', ['ready', 'filming']),
        db
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'scheduled'),
        db
          .from('profiles')
          .select('streak_count, last_post_date, xp')
          .eq('id', userId)
          .maybeSingle(),
        db
          .from('instagram_posts')
          .select('posted_at')
          .eq('user_id', userId)
          .not('posted_at', 'is', null)
          .order('posted_at', { ascending: false })
          .limit(1),
      ]);

    const ideasCount = ideasRes.count ?? 0;
    const scriptingCount = scriptingRes.count ?? 0;
    const readyCount = readyRes.count ?? 0;
    const scheduledCount = scheduledRes.count ?? 0;
    const streakCount =
      typeof profileRes.data?.streak_count === 'number'
        ? profileRes.data.streak_count
        : 0;
    const xp = typeof profileRes.data?.xp === 'number' ? profileRes.data.xp : 0;
    const lastPostAt =
      lastPostRes.data && lastPostRes.data.length > 0
        ? (lastPostRes.data[0].posted_at as string)
        : null;

    // Determine if creator posted today
    const todayDate = new Date().toDateString();
    const lastPostDate = profileRes.data?.last_post_date
      ? new Date(profileRes.data.last_post_date as string)
      : null;
    const hasPostedToday = lastPostDate !== null && lastPostDate.toDateString() === todayDate;

    let nextBestAction: NextBestAction;
    if (hasPostedToday) {
      nextBestAction = 'review_performance';
    } else if (readyCount > 0) {
      nextBestAction = 'film';
    } else if (scriptingCount > 0) {
      nextBestAction = 'finish_script';
    } else if (ideasCount > 0) {
      nextBestAction = 'turn_idea_into_script';
    } else {
      nextBestAction = 'grab_trend';
    }

    const payload: CreatorTodayPayload = {
      ideasCount,
      scriptingCount,
      readyCount,
      scheduledCount,
      lastPostAt,
      streakCount,
      xp,
      hasPostedToday,
      nextBestAction,
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error('creator/today error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
