import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export type NextBestAction =
  | 'film'
  | 'finish_script'
  | 'turn_idea_into_script'
  | 'grab_trend';

export type CreatorTodayPayload = {
  ideasCount: number;
  scriptingCount: number;
  readyCount: number;
  scheduledCount: number;
  lastPostAt: string | null;
  streakCount: number;
  nextBestAction: NextBestAction;
};

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Parallel queries for speed
    const [ideasRes, scriptingRes, readyRes, scheduledRes, profileRes, lastPostRes] =
      await Promise.all([
        supabase
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'idea'),
        supabase
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'scripting'),
        supabase
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('status', ['ready', 'filming']),
        supabase
          .from('content_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'scheduled'),
        supabase
          .from('profiles')
          .select('streak_count')
          .eq('id', userId)
          .maybeSingle(),
        supabase
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
    const lastPostAt =
      lastPostRes.data && lastPostRes.data.length > 0
        ? (lastPostRes.data[0].posted_at as string)
        : null;

    let nextBestAction: NextBestAction;
    if (readyCount > 0) {
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
