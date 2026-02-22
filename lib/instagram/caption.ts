import { generatePostAssets } from '@/lib/gemini';
import { MIN_HASHTAGS, MAX_HASHTAGS } from './constants';

export interface CaptionInput {
  niche: string;
  goal: 'growth' | 'engagement' | 'sales' | 'authority';
  tone: 'bold' | 'educational' | 'casual' | 'luxury' | 'motivational';
  media_type: 'image' | 'video' | 'carousel';
  keywords?: string[];
}

export interface CaptionOutput {
  caption: string;
  hashtags: string[];
  firstComment?: string;
}

const MAX_CAPTION_LENGTH = 2200;

const GOAL_MAP: Record<CaptionInput['goal'], 'comments' | 'sales' | 'reach'> = {
  growth: 'reach',
  engagement: 'comments',
  sales: 'sales',
  authority: 'reach',
};

function validateInput(input: CaptionInput): void {
  const niche = input.niche?.trim();
  if (!niche || niche.length < 1) {
    throw new Error('niche is required and must be non-empty');
  }
  const goals: CaptionInput['goal'][] = ['growth', 'engagement', 'sales', 'authority'];
  const tones: CaptionInput['tone'][] = ['bold', 'educational', 'casual', 'luxury', 'motivational'];
  const mediaTypes: CaptionInput['media_type'][] = ['image', 'video', 'carousel'];
  if (!goals.includes(input.goal)) throw new Error('invalid goal');
  if (!tones.includes(input.tone)) throw new Error('invalid tone');
  if (!mediaTypes.includes(input.media_type)) throw new Error('invalid media_type');
}

function normalizeHashtags(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const tag = (typeof t === 'string' ? t : '').replace(/^#+/g, '').trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  if (out.length < MIN_HASHTAGS) return out;
  return out.slice(0, MAX_HASHTAGS);
}

function pickCaption(
  assets: { hookCaption: string; storyCaption: string; minimalistCaption: string },
  tone: CaptionInput['tone']
): string {
  switch (tone) {
    case 'bold':
      return assets.hookCaption;
    case 'casual':
      return assets.minimalistCaption;
    case 'educational':
    case 'luxury':
    case 'motivational':
    default:
      return assets.storyCaption;
  }
}

export async function generateInstagramCaption(input: CaptionInput): Promise<CaptionOutput> {
  validateInput(input);

  const geminiGoal = GOAL_MAP[input.goal];
  const mediaTypeForApi: 'image' | 'video' = input.media_type === 'carousel' ? 'image' : input.media_type;
  const vibe = [input.tone, input.niche.trim()]
    .concat(input.keywords?.length ? [`keywords: ${input.keywords.slice(0, 10).join(', ')}`] : [])
    .join('; ');

  const assets = await generatePostAssets(
    mediaTypeForApi,
    vibe,
    'instagram',
    geminiGoal
  );

  let caption = pickCaption(assets, input.tone);
  if (caption.length > MAX_CAPTION_LENGTH) {
    caption = caption.slice(0, MAX_CAPTION_LENGTH - 3) + '...';
  }

  const hashtags = normalizeHashtags(assets.hashtags ?? []).slice(0, MAX_HASHTAGS);

  const result: CaptionOutput = {
    caption,
    hashtags,
  };
  if (assets.firstComment?.trim()) {
    result.firstComment = assets.firstComment.trim();
  }
  return result;
}
