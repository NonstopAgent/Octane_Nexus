import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  buildDemoContentPosts,
  buildDemoSavedBlueprints,
  buildDemoProfileAnalyticsHistory,
  buildDemoInstagramPosts,
  getNextWeekIso,
} from '@/lib/demo-seed';

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
    const now = new Date().toISOString();
    const nextWeekIso = getNextWeekIso();

    // 1) content_posts (tagged with [DEMO] in title)
    const contentRows = buildDemoContentPosts(userId, now, nextWeekIso);
    const { data: insertedPosts, error: postsErr } = await supabase
      .from('content_posts')
      .insert(contentRows)
      .select('id');

    if (postsErr) {
      return NextResponse.json({ error: 'Failed to seed content_posts: ' + postsErr.message }, { status: 500 });
    }

    // 2) saved_blueprints (tagged with [DEMO] in idea) – table may not exist in all projects
    const blueprintRows = buildDemoSavedBlueprints(userId, now);
    const { error: blueprintsErr } = await supabase.from('saved_blueprints').insert(blueprintRows);
    if (blueprintsErr) {
      // Log but don't fail – table might be missing
      console.warn('Demo seed: saved_blueprints insert failed (table may not exist):', blueprintsErr.message);
    }

    // 3) profile_analytics_history – track IDs for reset
    const historyRows = buildDemoProfileAnalyticsHistory(userId);
    const { data: insertedHistory, error: historyErr } = await supabase
      .from('profile_analytics_history')
      .insert(historyRows)
      .select('id');

    if (historyErr) {
      return NextResponse.json({ error: 'Failed to seed profile_analytics_history: ' + historyErr.message }, { status: 500 });
    }

    const historyIds = (insertedHistory ?? []).map((r) => r.id);
    if (historyIds.length > 0) {
      const { error: trackHistoryErr } = await supabase.from('demo_seeded_ids').insert(
        historyIds.map((record_id) => ({
          user_id: userId,
          table_name: 'profile_analytics_history',
          record_id,
        }))
      );
      if (trackHistoryErr) {
        console.warn('Demo seed: failed to track profile_analytics_history IDs:', trackHistoryErr.message);
      }
    }

    // 4) instagram_posts – for /api/intelligence/context (quality_score, posted_at); track IDs
    const igRows = buildDemoInstagramPosts(userId);
    const { data: insertedIg, error: igErr } = await supabase
      .from('instagram_posts')
      .insert(igRows)
      .select('id');

    if (!igErr && insertedIg && insertedIg.length > 0) {
      const { error: trackIgErr } = await supabase.from('demo_seeded_ids').insert(
        insertedIg.map((r) => ({
          user_id: userId,
          table_name: 'instagram_posts',
          record_id: r.id,
        }))
      );
      if (trackIgErr) {
        console.warn('Demo seed: failed to track instagram_posts IDs:', trackIgErr.message);
      }
    }
    // If instagram_posts insert fails (e.g. table or RLS), continue – context API will still work with empty history

    // 5) Optional: add demo linked account for Monitoring if none set
    const { data: profile } = await supabase.from('profiles').select('linked_accounts').eq('id', userId).maybeSingle();
    const linked = (profile?.linked_accounts as Record<string, string> | null) ?? {};
    const hasAny = linked.instagram || linked.tiktok || linked.youtube || linked.x;
    if (!hasAny) {
      await supabase
        .from('profiles')
        .update({
          linked_accounts: {
            ...linked,
            instagram: '@demo_user',
          },
        })
        .eq('id', userId);
    }

    const count =
      (insertedPosts?.length ?? 0) +
      blueprintRows.length +
      historyIds.length +
      (insertedIg?.length ?? 0);

    return NextResponse.json({ success: true, count });
  } catch (e) {
    console.error('Demo seed error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
