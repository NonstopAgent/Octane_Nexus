import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { callGeminiModel, extractGeminiText } from '@/lib/geminiModels';
import { detectTrends, type TrendInputVideo, type TrendCluster } from '@/lib/trendDetection';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type CachedVideo = {
  id: string;
  title: string;
  viewCount: number;
  publishedAt: string;
  thumbnailUrl?: string;
};

export type TrendResponseCluster = {
  topic: string;
  channels: string[];
  channelCount: number;
  windowDays: number;
  totalViews: number;
  whyItMatters: string; // Gemini analysis; '' when unavailable
  videos: Array<{
    id: string;
    title: string;
    channelTitle: string;
    viewCount: string;
    publishedAt: string;
    thumbnailUrl: string | null;
    youtubeUrl: string;
  }>;
};

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

/**
 * GET /api/trends/generate
 *
 * Returns TRENDS — topics that multiple tracked channels covered inside the
 * same short window — not a view-count leaderboard.
 *
 * The previous version returned the top 8 competitor videos by raw views,
 * which surfaced the same evergreen uploads every day and told the creator
 * nothing they could act on. See lib/trendDetection for the reasoning.
 *
 * Response states, all explicit so the UI never has to guess:
 *   needsChannels  - no tracked channels yet
 *   needsRefresh   - channels tracked but nothing cached
 *   staleData      - cached videos exist but all are older than the window
 *   trends: []     - everything fresh, genuinely no cross-channel overlap
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('niche')
      .eq('id', user.id)
      .maybeSingle();
    const niche = profile?.niche || 'content creation';

    const { data: channels, error: chanErr } = await supabase
      .from('tracked_channels')
      .select('channel_title, recent_videos, last_synced_at')
      .eq('user_id', user.id);

    if (chanErr) {
      console.error('trends/generate: tracked_channels query failed', chanErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!channels || channels.length === 0) {
      return NextResponse.json({ trends: [], niche, needsChannels: true });
    }

    const all: TrendInputVideo[] = [];
    for (const ch of channels) {
      const channelTitle = (ch.channel_title as string) || 'Unknown channel';
      const videos = Array.isArray(ch.recent_videos) ? (ch.recent_videos as CachedVideo[]) : [];
      for (const v of videos) {
        if (!v?.id || !v?.title) continue;
        all.push({
          id: v.id,
          title: v.title,
          channel: channelTitle,
          viewCount: Number(v.viewCount) || 0,
          publishedAt: v.publishedAt || '',
          thumbnailUrl: v.thumbnailUrl || null,
        });
      }
    }

    if (all.length === 0) {
      return NextResponse.json({
        trends: [],
        niche,
        needsChannels: false,
        needsRefresh: true,
      });
    }

    const WINDOW_DAYS = 14;
    const clusters = detectTrends(all, { windowDays: WINDOW_DAYS, minChannels: 2, limit: 6 });

    // Distinguish "nothing is trending" from "all our data is months old".
    // Those look identical to a user but mean completely different things:
    // the first is a real answer, the second is a broken sync.
    const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const freshCount = all.filter((v) => {
      const t = new Date(v.publishedAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    }).length;

    const newestSync = channels
      .map((c) => (c.last_synced_at ? new Date(c.last_synced_at as string).getTime() : 0))
      .reduce((a, b) => Math.max(a, b), 0);

    const response = {
      niche,
      needsChannels: false,
      windowDays: WINDOW_DAYS,
      channelsTracked: channels.length,
      videosConsidered: all.length,
      freshVideos: freshCount,
      staleData: freshCount === 0,
      lastSyncedAt: newestSync ? new Date(newestSync).toISOString() : null,
      trends: [] as TrendResponseCluster[],
    };

    if (clusters.length === 0) {
      return NextResponse.json(response);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    response.trends = apiKey
      ? await explainTrends(apiKey, clusters, niche)
      // Explicit arrow: passing toResponseCluster directly would feed the
      // array index into whyItMatters as the second argument.
      : clusters.map((c) => toResponseCluster(c));

    return NextResponse.json(response);
  } catch (err) {
    console.error('trends/generate error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function toResponseCluster(c: TrendCluster, whyItMatters = ''): TrendResponseCluster {
  return {
    topic: c.topic,
    channels: c.channels,
    channelCount: c.channelCount,
    windowDays: c.windowDays,
    totalViews: c.totalViews,
    whyItMatters,
    videos: c.videos.map((v) => ({
      id: v.id,
      title: v.title,
      channelTitle: v.channel,
      viewCount: formatViews(v.viewCount),
      publishedAt: v.publishedAt,
      thumbnailUrl: v.thumbnailUrl ?? null,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
    })),
  };
}

/**
 * One Gemini call for all clusters. The model explains why the convergence
 * matters and what angle is still open — it does NOT decide what is trending.
 * The clustering is deterministic; the AI only interprets it.
 */
async function explainTrends(
  apiKey: string,
  clusters: TrendCluster[],
  niche: string
): Promise<TrendResponseCluster[]> {
  const block = clusters
    .map(
      (c, i) =>
        `${i + 1}. Topic "${c.topic}" — covered by ${c.channelCount} channels (${c.channels.join(
          ', '
        )}) within ${c.windowDays} days.\n   Titles: ${c.videos
          .map((v) => `"${v.title}"`)
          .join('; ')}`
    )
    .join('\n');

  const prompt = `You are a YouTube strategist advising a creator in the niche "${niche}".

Below are topics that MULTIPLE competitor channels independently covered inside the same short window. That convergence is the signal — several creators betting on the same subject at once.

${block}

For EACH topic, write ONE sentence (max 25 words) telling the creator why this convergence matters and what angle is still unclaimed. Be specific to the actual titles. Do not say "this is trending" — they can see that. Tell them what to do about it.

Respond with ONLY a JSON array of ${clusters.length} strings, in the same order. No markdown.`;

  try {
    const res = await callGeminiModel(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 700,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    if (!res.ok) throw new Error(res.error || `Gemini ${res.status}`);

    const cleaned = extractGeminiText(res.data)
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error('Gemini returned non-array');

    return clusters.map((c, i) =>
      toResponseCluster(c, typeof parsed[i] === 'string' ? (parsed[i] as string) : '')
    );
  } catch (err) {
    // Degrade to the deterministic clusters. The trend itself is real maths;
    // only the commentary is missing, so showing it is still correct.
    console.warn('trends/generate: analysis unavailable, returning clusters only', err);
    return clusters.map((c) => toResponseCluster(c));
  }
}
