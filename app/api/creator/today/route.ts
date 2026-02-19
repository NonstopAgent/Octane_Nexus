import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { getEffectiveUserId } from '@/lib/effectiveUser';
import { POST_STATUS } from '@/lib/constants';

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
  pipeline?: Record<string, number>;
  topActions?: { label: string; href: string; cta: string }[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zdvedfnpipgygvikoooa.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1EEA1MtGEqz8vWJAApQM6Q_FnjK-aaw';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await supabase.auth.getUser();
    // Demo mode: allow unauthenticated when x-demo-mode header or cookie present
    const demoHeader = req.headers.get('x-demo-mode') === 'true';
    const demoCookie = req.cookies.get('octane_demo_mode')?.value === 'true';
    const effectiveUserId = getEffectiveUserId(user?.id ?? null) ?? (demoHeader || demoCookie ? 'demo_user_mvp_v1' : null);

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try content_posts table; fallback to mock counts for demo
    let counts = {
      idea: 0,
      scripting: 0,
      filming: 0,
      ready: 0,
      scheduled: 0,
      posted: 0,
    };

    try {
      const { data: posts, error } = await supabase
        .from('content_posts')
        .select('status')
        .eq('user_id', effectiveUserId);

      if (!error && Array.isArray(posts)) {
        for (const p of posts) {
          const s = (p?.status as string) || '';
          if (s in counts) (counts as Record<string, number>)[s]++;
        }
      }
    } catch {
      // Table may not exist; use mock for demo
      if (effectiveUserId === 'demo_user_mvp_v1') {
        counts = { idea: 2, scripting: 1, filming: 1, ready: 3, scheduled: 2, posted: 5 };
      }
    }

    const pipeline = {
      [POST_STATUS.IDEA]: counts.idea,
      [POST_STATUS.SCRIPTING]: counts.scripting,
      [POST_STATUS.FILMING]: counts.filming,
      [POST_STATUS.READY]: counts.ready,
      [POST_STATUS.SCHEDULED]: counts.scheduled,
      [POST_STATUS.POSTED]: counts.posted,
    };

    const topActions = [
      { label: 'Pick 1 idea from Trends', href: '/trends', cta: 'Go to Trends' },
      { label: 'Move 1 post to Ready', href: '/dashboard/production', cta: 'Production Board' },
      { label: 'Schedule 1 ready post', href: '/dashboard/schedule', cta: 'Schedule' },
    ];

    const hasPostedToday = counts.posted > 0;
    let nextBestAction: NextBestAction;
    if (hasPostedToday) nextBestAction = 'review_performance';
    else if (counts.ready > 0) nextBestAction = 'film';
    else if (counts.scripting > 0) nextBestAction = 'finish_script';
    else if (counts.idea > 0) nextBestAction = 'turn_idea_into_script';
    else nextBestAction = 'grab_trend';

    const payload: CreatorTodayPayload = {
      ideasCount: counts.idea,
      scriptingCount: counts.scripting,
      readyCount: counts.ready + counts.filming,
      scheduledCount: counts.scheduled,
      lastPostAt: null,
      streakCount: 0,
      xp: 0,
      hasPostedToday,
      nextBestAction,
      pipeline,
      topActions,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error('creator/today error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
