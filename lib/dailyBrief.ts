/**
 * Daily Brief Generator — v2 (Intelligent Edition)
 * ==================================================
 * The brain of the morning intelligence brief. Now powered by three layers:
 *
 *   LAYER 1 — Outlier Detection (deterministic math)
 *     Before the AI sees any competitor data, a statistical algorithm
 *     calculates each video's outlier score (views / channel median).
 *     Only videos performing 2.5x+ above their channel's baseline are
 *     passed to Gemini. The AI is told the score and hook type — so it
 *     acts as an analyst, not a guesser.
 *
 *   LAYER 2 — Persistent Creator Memory (brief profile)
 *     Before generating, the system loads the creator's brief profile:
 *     what hook types they respond to, what formats they ignore, what
 *     ideas we've already suggested. This is injected into the prompt
 *     so the AI never repeats itself and always personalizes to the
 *     creator's actual behavior.
 *
 *   LAYER 3 — Implicit Feedback Loop (async, runs in cron)
 *     After a brief is generated, the suggested idea is logged to
 *     brief_suggestions. The feedback loop (briefFeedback.ts) later
 *     checks if the creator filmed it and updates their profile.
 *     The longer they use Octane Nexus, the smarter it gets for them.
 *
 * Designed to run from a cron job (overnight) or on-demand from the
 * /api/brief/generate route.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { callGeminiModel, extractGeminiText } from '@/lib/geminiModels';
import {
  detectOutliers,
  detectOwnOutliers,
  formatOutliersForPrompt,
  type RawCompetitorVideo,
} from '@/lib/outlierDetection';
import {
  getCreatorBriefProfile,
  buildBriefMemoryBlock,
  logBriefSuggestion,
  ensureBriefProfile,
} from '@/lib/briefMemory';

export type CompetitorInsight = {
  channel: string;
  video_title: string;
  video_id: string;
  view_count: number;
  outlier_score?: number;
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
    for (const v of videos.slice(0, 10)) {
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
 * Build the enhanced prompt for Gemini.
 *
 * Key upgrades vs. v1:
 *   - Competitor section now shows ONLY outlier videos with their outlier
 *     score and hook type (pre-calculated by the algorithm, not guessed by AI)
 *   - Creator's own outliers are detected and highlighted separately
 *   - Creator brief memory is injected (what works, what to avoid, past ideas)
 *   - Rules explicitly tell the AI to use the outlier data and memory
 */
function buildBriefPrompt(
  ctx: NonNullable<Awaited<ReturnType<typeof gatherUserContext>>>,
  memoryBlock: string
): string {
  const { profile, topVideos, recentVideos, competitorVideos } = ctx;

  // --- LAYER 1: Run outlier detection on competitor videos ---
  const rawCompetitorVideos: RawCompetitorVideo[] = competitorVideos.map((v) => ({
    id: v.video_id,
    title: v.title,
    viewCount: v.view_count,
    publishedAt: v.published_at,
    channel: v.channel,
  }));

  const outliers = detectOutliers(rawCompetitorVideos, 2.5, 30);
  const outlierText = formatOutliersForPrompt(outliers);

  // --- LAYER 1: Run outlier detection on creator's own videos ---
  const allOwnVideos = [...topVideos, ...recentVideos].filter(
    (v, i, arr) => arr.findIndex((x) => x.title === v.title) === i // deduplicate
  );
  const ownOutliers = detectOwnOutliers(allOwnVideos, 2.0);

  const ownOutlierText = ownOutliers.length > 0
    ? ownOutliers.slice(0, 3).map((v) =>
        `  - "${v.title}" — ${v.views.toLocaleString()} views (${v.outlierScore.toFixed(1)}x their own avg, hook type: ${v.hookType})`
      ).join('\n')
    : null;

  const topVideosText = topVideos.length > 0
    ? topVideos.slice(0, 5).map((v, i) => `  ${i + 1}. "${v.title}" — ${v.views.toLocaleString()} views`).join('\n')
    : '  (none yet)';

  const recentVideosText = recentVideos.length > 0
    ? recentVideos.slice(0, 5).map((v, i) => `  ${i + 1}. "${v.title}" — ${v.views.toLocaleString()} views`).join('\n')
    : '  (none yet)';

  // Build the outlier count summary for the rules section
  const outlierCount = outliers.length;
  const superOutlierCount = outliers.filter((o) => o.outlierTier === 'super').length;

  return `You are generating a Daily Brief for a YouTube creator. Output ONLY valid JSON, no markdown fences, no commentary.

CREATOR CONTEXT:
- Niche: ${profile.niche}
${profile.vibe ? `- Voice/Style: ${profile.vibe}` : ''}
${profile.brand_vision ? `- Brand vision: ${profile.brand_vision}` : ''}

${memoryBlock ? memoryBlock + '\n' : ''}
THEIR TOP-PERFORMING VIDEOS (all time):
${topVideosText}

THEIR MOST RECENT VIDEOS:
${recentVideosText}

${ownOutlierText ? `THEIR OWN OUTLIER VIDEOS (performing 2x+ above their average — these formats WORK for them):\n${ownOutlierText}\n` : ''}
COMPETITOR OUTLIER VIDEOS (mathematically proven to be outperforming their channel's baseline):
Note: ${outlierCount} outlier(s) detected. ${superOutlierCount > 0 ? `${superOutlierCount} are SUPER outliers (10x+ their channel avg).` : ''} These are NOT just popular videos — they are specifically over-performing relative to each channel's own average.
${outlierText}

TASK: Generate a personalized morning brief with three sections. Be specific and reference actual data. NEVER give generic advice.

Output exactly this JSON structure (no other keys, no markdown, no preamble):
{
  "competitor_insights": [
    {
      "channel": "channel name",
      "video_title": "exact title",
      "video_id": "the id from the data above",
      "view_count": 123456,
      "outlier_score": 3.2,
      "why_it_worked": "1-2 sentence specific analysis of the hook/format/angle that drove views — reference the hook_type from the data",
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
    "why_now": "1 sentence explaining why THIS idea TODAY based on the outlier data above"
  }
}

RULES:
- competitor_insights: ONLY use videos from the COMPETITOR OUTLIER VIDEOS section above. These are mathematically proven outliers. Pick the top 3 by outlier_score. If no outliers detected, return [].
- your_patterns: 2-3 patterns from THEIR actual videos. If they have own outliers, reference those specifically. If they have no videos yet, return [{"insight": "Connect YouTube and import your videos to unlock pattern detection", "evidence": [], "confidence": "low"}].
- todays_idea: ONE idea. Ground it in a specific outlier hook_type that's working in their niche. If they have own outliers, adapt the format that worked for them. If creator memory says they ignore certain formats, do NOT suggest those formats.
- Match their voice/style if provided.
- The hook must be a real opening line, not a description of one.
- Do NOT suggest any idea title that appears in the creator memory's "already suggested" list.`;
}

function getGeminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

/**
 * Generate a daily brief by calling Gemini with the assembled context.
 * Returns the parsed brief, or null on failure.
 */
export async function generateBrief(
  ctx: NonNullable<Awaited<ReturnType<typeof gatherUserContext>>>,
  memoryBlock: string
): Promise<{ brief: DailyBrief; model: string; ms: number } | null> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    console.error('generateBrief: no Gemini API key');
    return null;
  }

  const prompt = buildBriefPrompt(ctx, memoryBlock);
  const start = Date.now();

  try {
    // Model choice, thinking-token suppression, and retirement fallback are
    // all handled centrally. Google has retired the model under this call
    // three times; see lib/geminiModels for the history.
    const response = await callGeminiModel(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 2500,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    if (!response.ok) {
      console.error('generateBrief: Gemini error', response.status, response.error);
      return null;
    }

    const model = response.model ?? 'unknown';
    const text = extractGeminiText(response.data);
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
 * Now also:
 *   - Loads creator brief memory (Layer 2) before generation
 *   - Logs the suggested idea after generation (Layer 3 setup)
 *
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

  // --- LAYER 2: Load creator brief memory ---
  await ensureBriefProfile(admin, userId);
  const briefProfile = await getCreatorBriefProfile(admin, userId);
  const memoryBlock = buildBriefMemoryBlock(briefProfile);

  const result = await generateBrief(ctx, memoryBlock);
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

  // --- LAYER 3: Log the suggestion for the feedback loop ---
  const idea = result.brief.todays_idea;
  if (idea.title) {
    // Find the top outlier that inspired this idea (if any) for source tracking
    const rawCompetitorVideos: RawCompetitorVideo[] = ctx.competitorVideos.map((v) => ({
      id: v.video_id,
      title: v.title,
      viewCount: v.view_count,
      publishedAt: v.published_at,
      channel: v.channel,
    }));
    const outliers = detectOutliers(rawCompetitorVideos, 2.5, 30);
    const topOutlier = outliers[0]; // The highest-scoring outlier that likely inspired the idea

    await logBriefSuggestion(
      admin,
      userId,
      data.id,
      briefDate,
      {
        title: idea.title,
        hook: idea.hook,
        format: idea.format,
      },
      topOutlier
        ? {
            hookType: topOutlier.hookType,
            sourceChannel: topOutlier.channel,
            sourceVideoId: topOutlier.id,
          }
        : undefined
    );
  }

  return { id: data.id, brief: result.brief };
}
