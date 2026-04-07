import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getServiceRoleClient } from '@/lib/youtubeOAuth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/youtube/disconnect
 * Deletes the user's YouTube connection. Does NOT delete the artifacts
 * already imported (those stay in memory).
 */
export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getServiceRoleClient();
    const { error } = await admin
      .from('creator_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'youtube');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ disconnected: true });
  } catch (err) {
    console.error('youtube/disconnect error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
