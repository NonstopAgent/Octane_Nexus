import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/performance
 *
 * Real numbers for the performance chart and the goal checklist.
 *
 * HISTORY — WHY THIS ENDPOINT EXISTS AT ALL
 * -----------------------------------------
 * There used to be a chart on /dashboard/monitoring. It was deleted in
 * commit 26ea93e7 with the note "remove all hardcoded STATS_DATA mock
 * numbers", and that was the right call: it plotted a STATS_DATA constant
 * containing invented figures (12,500 followers, 84,320 reach) that had no
 * connection to any real account.
 *
 * Restoring that file would put fabricated analytics back in front of
 * creators. So the chart is rebuilt here on the creator's actual imported
 * YouTube videos, and every goal below is computed from real database state
 * rather than a flag someone can set by hand.
 *
 * When a creator has imported nothing, this returns empty series and
 * unchecked goals. That is the honest answer and the UI says so.
 */

type PerfPoint = {
  date: string;   // ISO date of publish
  views: number;
  title: string;
};

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createServiceRoleClient();

    const [artifactsRes, channelsRes, connectionRes, briefsRes] = await Promise.all([
      admin
        .from('creator_artifacts')
        .select('title, performance')
        .eq('user_id', user.id)
        .eq('source', 'imported_youtube')
        .limit(100),
      admin.from('tracked_channels').select('id').eq('user_id', user.id),
      admin
        .from('creator_connections')
        .select('provider')
        .eq('user_id', user.id)
        .eq('provider', 'youtube')
        .maybeSingle(),
      admin
        .from('daily_briefs')
        .select('id, brief_date')
        .eq('user_id', user.id)
        .order('brief_date', { ascending: false })
        .limit(30),
    ]);

    const artifacts = artifactsRes.data || [];
    const trackedCount = (channelsRes.data || []).length;
    const youtubeConnected = Boolean(connectionRes.data);
    const briefs = briefsRes.data || [];

    // Build the series from videos that actually have a publish date and views.
    const series: PerfPoint[] = artifacts
      .map((a) => {
        const perf = (a.performance as { views?: number; posted_at?: string }) || {};
        const views = Number(perf.views) || 0;
        const posted = perf.posted_at || '';
        const t = new Date(posted).getTime();
        if (!Number.isFinite(t) || views <= 0) return null;
        return { date: new Date(t).toISOString().slice(0, 10), views, title: a.title || '' };
      })
      .filter((p): p is PerfPoint => p !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const viewCounts = series.map((p) => p.views);
    const totalViews = viewCounts.reduce((s, v) => s + v, 0);
    const avgViews = viewCounts.length ? Math.round(totalViews / viewCounts.length) : 0;
    const bestVideo = series.reduce<PerfPoint | null>(
      (best, p) => (!best || p.views > best.views ? p : best),
      null
    );

    // Goals are derived, never stored. A checkbox that someone can tick
    // without doing the thing is decoration.
    const goals = [
      {
        id: 'connect_youtube',
        label: 'Connect your YouTube channel',
        done: youtubeConnected,
        hint: 'Powers pattern detection in your brief',
        href: '/dashboard/settings',
      },
      {
        id: 'import_videos',
        label: 'Import your videos',
        done: artifacts.length > 0,
        hint: artifacts.length > 0
          ? `${artifacts.length} imported`
          : 'Sync from Settings — nothing imported yet',
        href: '/dashboard/settings',
      },
      {
        id: 'track_competitors',
        label: 'Track at least 2 competitor channels',
        done: trackedCount >= 2,
        hint: trackedCount > 0 ? `${trackedCount} tracked` : 'Needed for trends and outliers',
        href: '/dashboard/brief',
      },
      {
        id: 'first_brief',
        label: 'Generate your first brief',
        done: briefs.length > 0,
        hint: briefs.length > 0 ? `${briefs.length} generated` : 'One screen, every morning',
        href: '/dashboard/brief',
      },
    ];

    return NextResponse.json({
      series,
      summary: {
        videoCount: series.length,
        totalViews,
        avgViews,
        bestTitle: bestVideo?.title || null,
        bestViews: bestVideo?.views || 0,
        briefCount: briefs.length,
      },
      goals,
      goalsCompleted: goals.filter((g) => g.done).length,
      goalsTotal: goals.length,
    });
  } catch (err) {
    console.error('performance error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
