import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { generateAndSaveBrief } from '@/lib/dailyBrief';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/brief/generate
 * On-demand brief generation for the current user. Uses whatever data
 * is currently in creator_artifacts (their videos) and tracked_channels
 * (competitor cached snapshots). The cron job refreshes those daily.
 *
 * Used by:
 *   - The "Generate today's brief" button on /dashboard/brief when no
 *     brief exists yet for the day
 *   - The first-time user flow after they connect YouTube + add channels
 */
export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createServiceRoleClient();
    const today = new Date().toISOString().slice(0, 10);

    // force: a creator pressing "Generate today's brief" is explicitly asking
    // for a fresh one, so bypass the idempotency guard the cron relies on.
    const result = await generateAndSaveBrief(admin, user.id, today, { force: true });
    if (!result) {
      return NextResponse.json(
        { error: 'Not enough data yet. Connect YouTube and import your videos, or add a tracked channel.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ brief: result.brief, id: result.id });
  } catch (err) {
    console.error('POST /api/brief/generate error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
