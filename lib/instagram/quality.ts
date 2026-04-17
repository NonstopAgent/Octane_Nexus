import type { PostMediaType, QualityScore } from './types';

// --- Weights
// TODO: Future performance-based learning could load weights from stored metrics (e.g. regression from likes/reach) and override these defaults.
const WEIGHT_HOOK = 0.3;
const WEIGHT_READABILITY = 0.2;
const WEIGHT_HASHTAG = 0.2;
const WEIGHT_CTA = 0.15;
const WEIGHT_FORMAT = 0.15;

const HOOK_MAX_CHARS = 125;
const CAPTION_MAX_CHARS = 2200;
const HASHTAG_MIN = 5;
const HASHTAG_MAX = 20;

// --- Rule-based scorers (0–100)

function scoreHookStrength(caption: string): number {
  const hook = (caption || '').trim().slice(0, HOOK_MAX_CHARS);
  if (!hook) return 0;
  const hasQuestion = /\?/.test(hook);
  const hasNumber = /\d/.test(hook);
  const hasEmoji = /\p{Extended_Pictographic}/u.test(hook);
  const wordCount = hook.split(/\s+/).filter(Boolean).length;
  const lineBreaks = (hook.match(/\n/g) || []).length;
  let s = 40;
  if (wordCount >= 5 && wordCount <= 25) s += 20;
  if (hasQuestion || hasNumber) s += 15;
  if (hasEmoji) s += 10;
  if (lineBreaks >= 1) s += 15;
  return Math.min(100, s);
}

function scoreCTAPresence(caption: string): number {
  const c = (caption || '').toLowerCase();
  const patterns = [
    /\b(comment|dm|follow|save|share|tag|link in bio|swipe|tap|click)\b/,
    /\b(save this|share this|tell me|drop a)\b/,
    /\?$/m,
  ];
  const matches = patterns.filter((p) => p.test(c)).length;
  if (matches >= 2) return 100;
  if (matches === 1) return 70;
  return 30;
}

function scoreReadability(caption: string): number {
  const text = (caption || '').trim();
  if (!text) return 0;
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);
  const avgSentenceLength = sentences.length ? words.length / sentences.length : 0;
  const lineBreaks = (text.match(/\n/g) || []).length;
  const hasParagraphs = lineBreaks >= 2;
  let s = 50;
  if (avgSentenceLength >= 8 && avgSentenceLength <= 25) s += 25;
  if (hasParagraphs) s += 25;
  return Math.min(100, s);
}

function scoreHashtagQuality(hashtags: string[]): number {
  const n = (hashtags || []).length;
  if (n < HASHTAG_MIN) return Math.max(0, (n / HASHTAG_MIN) * 60);
  if (n > HASHTAG_MAX) return Math.max(0, 80 - (n - HASHTAG_MAX) * 2);
  const normalized = hashtags.map((t) => (t.startsWith('#') ? t.slice(1) : t).toLowerCase());
  const unique = new Set(normalized).size;
  const mix = unique === normalized.length ? 1 : unique / Math.max(1, normalized.length);
  const inRange = n >= HASHTAG_MIN && n <= HASHTAG_MAX ? 1 : 0;
  return Math.min(100, Math.round(40 * inRange + 30 * (n / HASHTAG_MAX) + 30 * mix));
}

function scoreMediaTypeCompliance(media_type: PostMediaType, caption: string): number {
  const c = (caption || '').toLowerCase();
  const hasCarouselHint = /\b(swipe|slide|1\/\d|carousel)\b/.test(c);
  const hasVideoHint = /\b(watch|reel|video|link in bio)\b/.test(c);
  switch (media_type) {
    case 'carousel':
      return hasCarouselHint ? 100 : 60;
    case 'video':
      return hasVideoHint ? 100 : 70;
    case 'image':
    default:
      return 80;
  }
}

function scoreLengthCompliance(caption: string): number {
  const len = (caption || '').length;
  if (len === 0) return 0;
  if (len <= CAPTION_MAX_CHARS) return 100;
  return Math.max(0, 100 - (len - CAPTION_MAX_CHARS) / 20);
}

// --- Build suggestions from rule scores

function buildSuggestions(
  hook: number,
  readability: number,
  hashtag: number,
  cta: number,
  format: number,
  caption: string,
  hashtags: string[]
): string[] {
  const s: string[] = [];
  if (hook < 60) s.push('Strengthen the first 125 characters: add a question, number, or line break.');
  if (readability < 60) s.push('Improve readability: use 8–25 words per sentence and short paragraphs.');
  if (hashtag < 60) {
    if ((hashtags || []).length < HASHTAG_MIN) s.push(`Add at least ${HASHTAG_MIN} relevant hashtags.`);
    else if ((hashtags || []).length > HASHTAG_MAX) s.push(`Use 5–${HASHTAG_MAX} hashtags for best reach.`);
    else s.push('Use a mix of niche and broad hashtags.');
  }
  if (cta < 50) s.push('Add a clear call-to-action (e.g. comment, save, share, link in bio).');
  if (format < 70) {
    if ((caption || '').length > CAPTION_MAX_CHARS) s.push(`Keep caption under ${CAPTION_MAX_CHARS} characters.`);
    else s.push('Align caption with post type (e.g. "Swipe" for carousels).');
  }
  return s;
}

// --- AI critique (calls Gemini via package; gemini.ts has no exported generic prompt API)

async function aiCritique(
  caption: string,
  hashtags: string[],
  media_type: PostMediaType
): Promise<{
  critique: string;
  improvementSuggestions: string[];
  psychologicalHooks: string[];
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      critique: 'AI critique unavailable: no API key.',
      improvementSuggestions: [],
      psychologicalHooks: [],
    };
  }
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are an Instagram content strategist. Critique this post and return ONLY valid JSON.

CAPTION:
${(caption || '').slice(0, 1500)}

HASHTAGS: ${(hashtags || []).slice(0, 30).join(', ')}
MEDIA TYPE: ${media_type}

Return this exact structure, no markdown:
{
  "critique": "2-4 sentences on overall strength and weaknesses",
  "improvementSuggestions": ["specific tip 1", "specific tip 2", "specific tip 3"],
  "psychologicalHooks": ["hook idea 1", "hook idea 2"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const raw = (text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}') + 1;
    if (start === -1 || end <= 0) throw new Error('Invalid JSON');
    const parsed = JSON.parse(raw.slice(start, end)) as {
      critique?: string;
      improvementSuggestions?: string[];
      psychologicalHooks?: string[];
    };
    return {
      critique: typeof parsed.critique === 'string' ? parsed.critique : '',
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
      psychologicalHooks: Array.isArray(parsed.psychologicalHooks) ? parsed.psychologicalHooks : [],
    };
  } catch {
    return {
      critique: 'AI critique could not be generated.',
      improvementSuggestions: [],
      psychologicalHooks: [],
    };
  }
}

// --- Main export

export async function scoreInstagramPost(
  post: {
    caption: string;
    hashtags: string[];
    media_type: PostMediaType;
  },
  useAI: boolean = false
): Promise<
  QualityScore & {
    aiCritique?: {
      critique: string;
      improvementSuggestions: string[];
      psychologicalHooks: string[];
    };
  }
> {
  const caption = post.caption ?? '';
  const hashtags = post.hashtags ?? [];
  const media_type = post.media_type ?? 'image';

  const hook = scoreHookStrength(caption);
  const readability = scoreReadability(caption);
  const hashtagScore = scoreHashtagQuality(hashtags);
  const cta = scoreCTAPresence(caption);
  const lengthScore = scoreLengthCompliance(caption);
  const mediaScore = scoreMediaTypeCompliance(media_type, caption);

  const formatCompliance = (lengthScore + mediaScore) / 2;
  // TODO: Future learning could replace this fixed formula with a model trained on instagram_posts.metrics (e.g. predict engagement from component scores).
  const overall = Math.round(
    WEIGHT_HOOK * hook +
      WEIGHT_READABILITY * readability +
      WEIGHT_HASHTAG * hashtagScore +
      WEIGHT_CTA * cta +
      WEIGHT_FORMAT * formatCompliance
  );

  const captionComposite = (hook * WEIGHT_HOOK + readability * WEIGHT_READABILITY + cta * WEIGHT_CTA + lengthScore * (WEIGHT_FORMAT / 2)) / (WEIGHT_HOOK + WEIGHT_READABILITY + WEIGHT_CTA + WEIGHT_FORMAT / 2);
  const base: QualityScore = {
    overall: Math.min(100, Math.max(0, overall)),
    breakdown: {
      caption: Math.round(Math.min(100, captionComposite)),
      hashtags: hashtagScore,
      media: mediaScore,
    },
    suggestions: buildSuggestions(hook, readability, hashtagScore, cta, formatCompliance, caption, hashtags),
  };

  if (!useAI) return base;

  const ai = await aiCritique(caption, hashtags, media_type);
  if (ai.improvementSuggestions.length) {
    base.suggestions = [...base.suggestions, ...ai.improvementSuggestions];
  }
  return {
    ...base,
    aiCritique: {
      critique: ai.critique,
      improvementSuggestions: ai.improvementSuggestions,
      psychologicalHooks: ai.psychologicalHooks,
    },
  };
}
