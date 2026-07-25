import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { callGeminiModel, extractGeminiText } from '@/lib/geminiModels';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type CachedVideo = {
  id: string;
  title: string;
  viewCount: number;
  publishedAt: string;
  thumbnailUrl?: string;
};

type TrendingVideo = {
  id: string;                // YouTube video id
  title: string;
  viewCount: string;         // formatted display string (e.g. "1.2M")
  viewCountRaw: number;      // actual number for sorting
  channelTitle: string;
  channelHandle: string | null;
  publishedAt: string;
  thumbnailUrl: string | null;
  youtubeUrl: string;        // real youtube link for click-through
  whyItWorked: string;       // Gemini analysis; empty string if unavailable
};

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

/**
 * GET /api/trends/generate
 * Returns the user's top-performing competitor videos from tracked_channels,
 * enriched with a one-sentence "why it worked" analysis from Gemini.
 *
 * If the user has no tracked channels yet, returns { videos: [], needsChannels: true }.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Niche for context/display
    const { data: profile } = await supabase
      .from('profiles')
      .select('niche, vibe')
      .eq('id', user.id)
      .maybeSingle();
    const niche = profile?.niche || 'content creation';

    // Pull tracked channels + their cached recent videos
    const { data: channels, error: chanErr } = await supabase
      .from('tracked_channels')
      .select('channel_title, channel_handle, thumbnail_url, recent_videos')
      .eq('user_id', user.id);

    if (chanErr) {
      console.error('trends/generate: tracked_channels query failed', chanErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!channels || channels.length === 0) {
      return NextResponse.json({
        videos: [],
        niche,
        needsChannels: true,
      });
    }

    // Flatten videos across channels
    const all: TrendingVideo[] = [];
    for (const ch of channels) {
      const channelTitle = (ch.channel_title as string) || 'Unknown channel';
      const channelHandle = (ch.channel_handle as string) || null;
      const videos = Array.isArray(ch.recent_videos) ? (ch.recent_videos as CachedVideo[]) : [];
      for (const v of videos) {
        if (!v?.id || !v?.title) continue;
        const viewCount = Number(v.viewCount) || 0;
        all.push({
          id: v.id,
          title: v.title,
          viewCount: formatViews(viewCount),
          viewCountRaw: viewCount,
          channelTitle,
          channelHandle,
          publishedAt: v.publishedAt || '',
          thumbnailUrl: v.thumbnailUrl || null,
          youtubeUrl: `https://www.youtube.com/watch?v=${v.id}`,
          whyItWorked: '',
        });
      }
    }

    if (all.length === 0) {
      return NextResponse.json({
        videos: [],
        niche,
        needsChannels: false,
        needsRefresh: true,
      });
    }

    // Sort by real view count, take top 8
    all.sort((a, b) => b.viewCountRaw - a.viewCountRaw);
    const top = all.slice(0, 8);

    // Optional Gemini enrichment: one call for all titles → "why it worked" each
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const enriched = await enrichWithAnalysis(apiKey, top, niche);
        return NextResponse.json({ videos: enriched, niche, needsChannels: false });
      } catch (err) {
        console.warn('trends/generate: Gemini enrichment failed, returning raw data', err);
      }
    }

    // Gemini unavailable or failed — return real video data without analysis
    return NextResponse.json({ videos: top, niche, needsChannels: false });
  } catch (err) {
    console.error('trends/generate error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Send the full list of titles in ONE Gemini call and parse back analyses.
 * We ask for a JSON array indexed the same order as the input so we can match
 * them back up without needing to parse per-video nuance.
 */
async function enrichWithAnalysis(
  apiKey: string,
  videos: TrendingVideo[],
  niche: string
): Promise<TrendingVideo[]> {
  const titlesBlock = videos
    .map(
      (v, i) =>
        `${i + 1}. [${v.channelTitle}] "${v.title}" — ${v.viewCount} views`
    )
    .join('\n');

  const prompt = `You are a YouTube growth analyst. Below are real competitor videos in the niche "${niche}", sorted by view count. For EACH one, write ONE sentence (max 20 words) explaining the specific hook, format, or pattern that likely drove those views. Be tactical and specific — reference the actual title words. Avoid generic advice like "great hook" or "strong title".

Videos:
${titlesBlock}

Respond with ONLY a JSON array of ${videos.length} strings, in the same order as the input. No markdown, no commentary.
Example: ["Contrarian take on X reframes the default assumption", "Specific number anchors credibility ...", ...]`;

  const res = await callGeminiModel(apiKey, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  if (!res.ok) {
    throw new Error(`Gemini returned ${res.status}: ${res.error}`);
  }

  const text = extractGeminiText(res.data);
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let analyses: unknown;
  try {
    analyses = JSON.parse(cleaned);
  } catch {
    throw new Error('Gemini returned non-JSON');
  }

  if (!Array.isArray(analyses)) {
    throw new Error('Gemini returned non-array');
  }

  return videos.map((v, i) => ({
    ...v,
    whyItWorked: typeof analyses[i] === 'string' ? (analyses[i] as string) : '',
  }));
}
