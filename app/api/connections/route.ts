import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/connections
 * Returns the user's connected platforms (SAFE fields only — never tokens).
 * The client uses this to render the Settings > Integrations page.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RLS on creator_connections allows users to select their own rows,
    // so this is safe via the user-scoped client. We still whitelist columns.
    const { data, error } = await supabase
      .from('creator_connections')
      .select('provider, provider_account_id, provider_username, provider_display_name, metadata, last_synced_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connections: data || [] });
  } catch (err) {
    console.error('GET /api/connections error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
