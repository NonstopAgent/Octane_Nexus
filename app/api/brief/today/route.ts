import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/brief/today
 * Returns today's daily brief for the current user, or null if not yet generated.
 * Marks the brief as viewed on first read.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const { data: brief, error } = await supabase
      .from('daily_briefs')
      .select('*')
      .eq('user_id', user.id)
      .eq('brief_date', today)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark as viewed (first read only)
    if (brief && !brief.user_viewed_at) {
      await supabase
        .from('daily_briefs')
        .update({ user_viewed_at: new Date().toISOString() })
        .eq('id', brief.id);
    }

    return NextResponse.json({ brief });
  } catch (err) {
    console.error('GET /api/brief/today error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
