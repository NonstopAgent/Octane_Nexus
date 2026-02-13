import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // 1) Delete content_posts with [DEMO] title
    const { error: delPostsErr } = await supabase
      .from('content_posts')
      .delete()
      .eq('user_id', userId)
      .like('title', '[DEMO]%');

    if (delPostsErr) {
      return NextResponse.json({ error: 'Failed to reset content_posts: ' + delPostsErr.message }, { status: 500 });
    }

    // 2) Delete saved_blueprints with [DEMO] idea (table may not exist)
    const { error: delBlueprintsErr } = await supabase
      .from('saved_blueprints')
      .delete()
      .eq('user_id', userId)
      .like('idea', '[DEMO]%');
    if (delBlueprintsErr) {
      console.warn('Demo reset: saved_blueprints delete failed:', delBlueprintsErr.message);
    }

    // 3) Delete profile_analytics_history and instagram_posts by tracked IDs
    const { data: tracked, error: trackErr } = await supabase
      .from('demo_seeded_ids')
      .select('table_name, record_id')
      .eq('user_id', userId);

    if (!trackErr && tracked && tracked.length > 0) {
      const byTable = new Map<string, string[]>();
      for (const row of tracked) {
        const list = byTable.get(row.table_name) ?? [];
        list.push(row.record_id);
        byTable.set(row.table_name, list);
      }
      for (const [table_name, ids] of byTable) {
        const { error: delErr } = await supabase.from(table_name).delete().in('id', ids);
        if (delErr) {
          console.warn(`Demo reset: delete from ${table_name} failed:`, delErr.message);
        }
      }
    }

    // 4) Remove demo_seeded_ids for this user
    await supabase.from('demo_seeded_ids').delete().eq('user_id', userId);

    // 5) Remove demo linked account if present
    const { data: profile } = await supabase.from('profiles').select('linked_accounts').eq('id', userId).maybeSingle();
    const linked = (profile?.linked_accounts as Record<string, string> | null) ?? {};
    if (linked.instagram === '@demo_user') {
      const rest = Object.fromEntries(Object.entries(linked).filter(([k]) => k !== 'instagram'));
      await supabase.from('profiles').update({ linked_accounts: rest }).eq('id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Demo reset error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
