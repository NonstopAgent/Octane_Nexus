import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import {
  buildDemoContentPosts,
  buildDemoSavedBlueprints,
  buildDemoProfileAnalyticsHistory,
  buildDemoInstagramPosts,
  buildDemoStyleTokens,
  getNextWeekIso,
} from '@/lib/demo-seed';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useServiceRole = !user;
    const db = useServiceRole ? createServiceRoleClient() : supabase;
    const now = new Date().toISOString();
    const nextWeekIso = getNextWeekIso();

    // 0) Idempotent: remove any existing demo data first
    await db.from('content_posts').delete().eq('user_id', userId).like('title', '[DEMO]%');
    await db.from('saved_blueprints').delete().eq('user_id', userId).like('idea', '[DEMO]%');
    // Clean tracked IDs
    const { data: tracked } = await db.from('demo_seeded_ids').select('table_name, record_id').eq('user_id', userId);
    if (tracked && tracked.length > 0) {
      const byTable = new Map<string, string[]>();
      for (const row of tracked) {
        const list = byTable.get(row.table_name) ?? [];
        list.push(row.record_id);
        byTable.set(row.table_name, list);
      }
      for (const [tbl, ids] of byTable) {
        await db.from(tbl).delete().in('id', ids);
      }
      await db.from('demo_seeded_ids').delete().eq('user_id', userId);
    }

    // 1) content_posts (tagged with [DEMO] in title)
    const contentRows = buildDemoContentPosts(userId, now, nextWeekIso);
    const { data: insertedPosts, error: postsErr } = await db
      .from('content_posts')
      .insert(contentRows)
      .select('id');

    if (postsErr) {
      return NextResponse.json({ error: 'Failed to seed content_posts: ' + postsErr.message }, { status: 500 });
    }

    // 2) saved_blueprints (tagged with [DEMO] in idea) – table may not exist in all projects
    const blueprintRows = buildDemoSavedBlueprints(userId, now);
    const { error: blueprintsErr } = await db.from('saved_blueprints').insert(blueprintRows);
    if (blueprintsErr) {
      // Log but don't fail – table might be missing
      console.warn('Demo seed: saved_blueprints insert failed (table may not exist):', blueprintsErr.message);
    }

    // 3) profile_analytics_history – track IDs for reset
    const historyRows = buildDemoProfileAnalyticsHistory(userId);
    const { data: insertedHistory, error: historyErr } = await db
      .from('profile_analytics_history')
      .insert(historyRows)
      .select('id');

    if (historyErr) {
      return NextResponse.json({ error: 'Failed to seed profile_analytics_history: ' + historyErr.message }, { status: 500 });
    }

    const historyIds = (insertedHistory ?? []).map((r) => r.id);
    if (historyIds.length > 0) {
      const { error: trackHistoryErr } = await db.from('demo_seeded_ids').insert(
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
    const { data: insertedIg, error: igErr } = await db
      .from('instagram_posts')
      .insert(igRows)
      .select('id');

    if (!igErr && insertedIg && insertedIg.length > 0) {
      const { error: trackIgErr } = await db.from('demo_seeded_ids').insert(
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

    // 5) Style token presets
    await db.from('style_tokens').delete().eq('user_id', userId).like('name', '[DEMO]%');
    const tokenRows = buildDemoStyleTokens(userId);
    const { data: insertedTokens, error: tokensErr } = await db.from('style_tokens').insert(tokenRows).select('id');
    if (tokensErr) {
      console.warn('Demo seed: style_tokens insert failed:', tokensErr.message);
    }
    if (insertedTokens && insertedTokens.length > 0) {
      await db.from('user_settings').upsert({
        user_id: userId,
        default_style_token_id: insertedTokens[0].id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    // 6) Set Tradeview AI brand identity on profile (skip linked_accounts — demo never fakes connections)
    if (user) {
      await db
        .from('profiles')
        .update({
          brand_vision: 'Tradeview AI — AI-powered trading insights',
          niche: 'ai trading & market insights',
        })
        .eq('id', userId);
    }

    const count =
      (insertedPosts?.length ?? 0) +
      blueprintRows.length +
      historyIds.length +
      (insertedIg?.length ?? 0) +
      (insertedTokens?.length ?? 0);

    return NextResponse.json({ success: true, count });
  } catch (e) {
    console.error('Demo seed error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
