/**
 * Daily Brief Generator
 * =====================
 * The brain of the morning intelligence brief. Pulls together:
 *   1. The user's own recent video performance (from creator_artifacts)
 *   2. What their tracked competitor channels uploaded recently
 *   3. The user's niche and brand voice (from profiles)
 * Asks Gemini to synthesize all of that into three structured sections:
 *   - competitor_insights: what's blowing up in their niche
 *   - your_patterns: what's actually working in their own content
 *   - todays_idea: ONE specific video idea ready to film
 *
 * Designed to run from a cron job (overnight) or on-demand from the
 * /api/brief/generate route.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type CompetitorInsight = {
  channel: string;
  video_title: string;
  video_id: string;
  view_count: number;
  why_it_worked: string;
  hook_pattern: string;
};

export type YourPattern = {
  insight: string;
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
};

export type TodaysIdea = {
  hook: string;
  title: string;
  thumbnail_concepts: string[];
  outline: string;
  format: string;
  why_now: string;
};

export type DailyBrief = {
  competitor_insights: CompetitorInsight[];
  your_patterns: YourPattern[];
  todays_idea: TodaysIdea;
};

type ProfileContext = {
  niche: string;
  vibe: string;
  brand_vision: string;
};

type TopVideoContext = {
  title: string;
  views: number;
  posted_at: string;
};

type CompetitorVideoContext = {
  channel: string;
  title: string;
  view_count: number;
  published_at: string;
  video_id: string;
};

/**
 * Pull all the context we need from the database for one user.
 * Returns null if the user has no data yet (we skip brief generation).
 */
export async function gatherUserContext(
  admin: SupabaseClient,
  userId: string
): Promise<{
  profile: ProfileContext;
  topVideos: TopVideoContext[];
  recentVideos: TopVideoContext[];
  competitorVideos: CompetitorVideoContext[];
} | null> {
  // Profile (niche, vibe, brand vision)
  const { data: profile } = await admin
    .from('profiles')
    .select('niche, vibe, brand_vision')
    .eq('id', userId)
    .maybeSingle();

  const niche = profile?.niche || 'content creation';
  const vibe = profile?.vibe || '';
  const brand_vision = profile?.brand_vision || '';

  // Top performing videos from creator_artifacts (these came from YouTube import)
  const { data: topArtifacts } = await admin
    .from('creator_artifacts')
    .select('title, content, performance')
    .eq('user_id', userId)
    .eq('source', 'imported_youtube')
    .not('performance->views', 'is', null)
    .order('performance->views', { ascending: false })
    .limit(10);

  // Most recent videos
  const { data: recentArtifacts } = await admin
    .from('creator_artifacts')
    .select('title, content, performance, created_at')
    .eq('user_id', userId)
    .eq('source', 'imported_youtube')
    .order('created_at', { ascending: false })
    .limit(5);

  const topVideos: TopVideoContext[] = (topArtifacts || []).map((a) => {
    const perf = (a.performance as { views?: number; posted_at?: string }) || {};
    return {
      title: a.title || (a.content as string)?.slice(0, 80) || '',
      views: Number(perf.views) || 0,
      posted_at: perf.posted_at || '',
    };
  });

  const recentVideos: TopVideoContext[] = (recentArtifacts || []).map((a) => {
    const perf = (a.performance as { views?: number; posted_at?: string }) || {};
    return {
      title: a.title || (a.content as string)?.slice(0, 80) || '',
      views: Number(perf.views) || 0,
      posted_at: perf.posted_at || '',
    };
  });

  // Competitor channels and their most recent videos (cached in tracked_channels.recent_videos)
  const { data: trackedChannels } = await admin
    .from('tracked_channels')
    .select('channel_title, recent_videos')
    .eq('user_id', userId);

  const competitorVideos: CompetitorVideoContext[] = [];
  for (const channel of trackedChannels || []) {
    const videos = (channel.recent_videos as Array<{
      id: string;
      title: string;
      viewCount: number;
      publishedAt: string;
    }>) || [];
    for (const v of videos.slice(0, 5)) {
      competitorVideos.push({
        channel: channel.channel_title,
        title: v.title,
        view_count: Number(v.viewCount) || 0,
        published_at: v.publishedAt,
        video_id: v.id,
      });
    }
  }

  // If user has nothing to work with, skip brief generation
  if (topVideos.length === 0 && competitorVideos.length === 0) {
    return null;
  }

  return {
    profile: { niche, vibe, brand_vision },
    topVideos,
    recentVideos,
    competitorVideos,
  };
}

/**
 * Build the prompt for Gemini given the assembled context.
 */
function buildBriefPrompt(ctx: NonNullable<Awaited<ReturnType<typeof gatherUserContext>>>): string {
  const { profile, topVideos, recentVideos, competitorVideos } = ctx;

  const topVideosText = topVideos.length > 0
    ? topVideos.slice(0, 5).map((v, i) => `  ${i + 1}. "${v.title}" — ${v.views.toLocaleString()} views`).join('\n')
    : '  (none yet)';

  const recentVideosText = recentVideos.length > 0
    ? recentVideos.slice(0, 5).map((v, i) => `  ${i + 1}. "${v.title}" — ${v.views.toLocaleString()} views`).join('\n')
    : '  (none yet)';

  const competitorText = competitorVideos.length > 0
    ? competitorVideos.slice(0, 15).map((v) =>
        `  - [${v.channel}] "${v.title}" — ${v.view_count.toLocaleString()} views (id: ${v.video_id})`
      ).join('\n')
    : '  (no tracked channels yet)';

  return `You are generating a Daily Brief for a YouTube creator. Output ONLY valid JSON, no markdown fences, no commentary.

CREATOR CONTEXT:
- Niche: ${profile.niche}
${profile.vibe ? `- Voice/Style: ${profile.vibe}` : ''}
${profile.brand_vision ? `- Brand vision: ${profile.brand_vision}` : ''}

THEIR TOP-PERFORMING VIDEOS:
${topVideosText}

THEIR MOST RECENT VIDEOS:
${recentVideosText}

WHAT THEIR TRACKED COMPETITOR CHANNELS PUBLISHED RECENTLY:
${competitorText}

TASK: Generate a personalized morning brief with three sections. Be specific and reference actual data. NEVER give generic advice.

Output exactly this JSON structure (no other keys, no markdown, no preamble):
{
  "competitor_insights": [
    {
      "channel": "channel name",
      "video_title": "exact title",
      "video_id": "the id from the data above",
      "view_count": 123456,
      "why_it_worked": "1-2 sentence specific analysis of the hook/format/angle that drove views",
      "hook_pattern": "the underlying pattern in 3-6 words like 'contrarian time-promise' or 'POV reaction'"
    }
  ],
  "your_patterns": [
    {
      "insight": "specific observation about what works in THIS creator's content",
      "evidence": ["video title 1", "video title 2"],
      "confidence": "high"
    }
  ],
  "todays_idea": {
    "hook": "the literal opening line of the video, 1 sentence",
    "title": "click-worthy title, under 70 chars",
    "thumbnail_concepts": [
      "concept 1: what's in frame and the text overlay",
      "concept 2: alternative",
      "concept 3: alternative"
    ],
    "outline": "3-5 sentence structure of the video: what they cover, in order",
    "format": "e.g. talking head, list, tutorial, reaction, story",
    "why_now": "1 sentence explaining why THIS idea TODAY based on the data above"
  }
}

RULES:
- competitor_insights: pick the 3 most relevant videos. If competitor data is empty, return [].
- your_patterns: 2-3 patterns from THEIR actual videos. If they have no videos yet, return [{"insight": "Connect YouTube and import your videos to unlock pattern detection", "evidence": [], "confidence": "low"}].
- todays_idea: ONE idea, not multiple. Ground it in either a competitor pattern that's working OR a pattern from their own content. Tell them why it'll work.
- Match their voice/style if provided.
- The hook must be a real opening line, not a description of one.`;
}

function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

/**
 * Generate a daily brief by calling Gemini with the assembled context.
 * Returns the parsed brief, or null on failure.
 */
export async function generateBrief(
  ctx: NonNullable<Awaited<ReturnType<typeof gatherUserContext>>>
): Promise<{ brief: DailyBrief; model: string; ms: number } | null> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    console.error('generateBrief: no Gemini API key');
    return null;
  }

  const model = 'gemini-2.5-flash';
  const prompt = buildBriefPrompt(ctx);
  const start = Date.now();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 2500,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('generateBrief: Gemini error', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      console.error('generateBrief: empty Gemini response');
      return null;
    }

    // Strip any markdown fencing in case the model wraps it
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let brief: DailyBrief;
    try {
      brief = JSON.parse(cleaned) as DailyBrief;
    } catch (parseErr) {
      console.error('generateBrief: failed to parse JSON', parseErr, cleaned.slice(0, 300));
      return null;
    }

    // Defensive defaults so the UI never crashes on missing keys
    if (!Array.isArray(brief.competitor_insights)) brief.competitor_insights = [];
    if (!Array.isArray(brief.your_patterns)) brief.your_patterns = [];
    if (!brief.todays_idea || typeof brief.todays_idea !== 'object') {
      brief.todays_idea = {
        hook: '',
        title: '',
        thumbnail_concepts: [],
        outline: '',
        format: '',
        why_now: '',
      };
    }

    return { brief, model, ms: Date.now() - start };
  } catch (err) {
    console.error('generateBrief: error', err);
    return null;
  }
}

/**
 * Top-level orchestration: gather context, generate brief, save to DB.
 * Used by both the cron job and the on-demand /api/brief/generate route.
 * Returns the saved brief id, or null if anything failed/skipped.
 */
export async function generateAndSaveBrief(
  admin: SupabaseClient,
  userId: string,
  briefDate: string // YYYY-MM-DD
): Promise<{ id: string; brief: DailyBrief } | null> {
  const ctx = await gatherUserContext(admin, userId);
  if (!ctx) {
    console.log(`generateAndSaveBrief: no context for user ${userId}, skipping`);
    return null;
  }

  const result = await generateBrief(ctx);
  if (!result) {
    console.error(`generateAndSaveBrief: generation failed for user ${userId}`);
    return null;
  }

  const { data, error } = await admin
    .from('daily_briefs')
    .upsert(
      {
        user_id: userId,
        brief_date: briefDate,
        competitor_insights: result.brief.competitor_insights,
        your_patterns: result.brief.your_patterns,
        todays_idea: result.brief.todays_idea,
        generated_at: new Date().toISOString(),
        model_used: result.model,
        generation_ms: result.ms,
      },
      { onConflict: 'user_id,brief_date' }
    )
    .select('id')
    .single();

  if (error || !data) {
    console.error(`generateAndSaveBrief: db upsert failed`, error?.message);
    return null;
  }

  return { id: data.id, brief: result.brief };
}
