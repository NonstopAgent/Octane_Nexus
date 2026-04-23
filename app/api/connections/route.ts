import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/connections
 * Returns the user's connected platforms (SAFE fields only — never tokens).
 * Also returns the count of imported videos per connection so the UI can
 * distinguish "synced and empty" from "synced with videos".
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('creator_connections')
      .select('provider, provider_account_id, provider_username, provider_display_name, metadata, last_synced_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with the count of imported videos per provider — so the UI can
    // show "YouTube connected ✓ — 0 videos" vs "videos imported ✓" instead of
    // lying when a sync ran against an empty channel.
    const connections = await Promise.all(
      (data || []).map(async (c) => {
        const source =
          c.provider === 'youtube' ? 'imported_youtube' : `imported_${c.provider}`;
        const { count } = await supabase
          .from('creator_artifacts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('source', source);
        return { ...c, imported_video_count: count || 0 };
      })
    );

    return NextResponse.json({ connections });
  } catch (err) {
    console.error('GET /api/connections error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
