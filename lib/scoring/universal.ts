import { scoreInstagramPost } from '@/lib/instagram/quality';
import type { PostMediaType } from '@/lib/instagram/types';

export type Platform = 'instagram' | 'tiktok' | 'youtube';

export type ContentFormat =
  | 'feed'
  | 'reel'
  | 'story'
  | 'short'
  | 'longform'
  | 'carousel';

export interface UniversalContentInput {
  platform: Platform;
  format: ContentFormat;
  caption?: string;
  hashtags?: string[];
  title?: string;
  description?: string;
  script?: string;
}

export interface UniversalScoreResult {
  platform: Platform;
  predictedScore: number;
  breakdown?: { caption: number; hashtags: number; media: number };
  aiCritique?: {
    critique: string;
    improvementSuggestions: string[];
    psychologicalHooks: string[];
  };
}

function formatToInstagramMediaType(format: ContentFormat): PostMediaType {
  switch (format) {
    case 'carousel':
      return 'carousel';
    case 'reel':
    case 'story':
    case 'short':
      return 'video';
    case 'feed':
    case 'longform':
    default:
      return 'image';
  }
}

// TODO: Future modules: TikTok scoring engine, YouTube scoring engine, thumbnail scoring, hook retention modeling.
export async function scoreContent(
  input: UniversalContentInput,
  useAI: boolean = false
): Promise<UniversalScoreResult> {
  const { platform } = input;

  if (platform === 'instagram') {
    const result = await scoreInstagramPost(
      {
        caption: input.caption ?? '',
        hashtags: input.hashtags ?? [],
        media_type: formatToInstagramMediaType(input.format),
      },
      useAI
    );
    return {
      platform: 'instagram',
      predictedScore: result.overall,
      breakdown: result.breakdown,
      ...(result.aiCritique && { aiCritique: result.aiCritique }),
    };
  }

  if (platform === 'tiktok') {
    // TODO: TikTok scoring engine
    return {
      platform: 'tiktok',
      predictedScore: 50,
    };
  }

  if (platform === 'youtube') {
    // TODO: YouTube scoring engine
    return {
      platform: 'youtube',
      predictedScore: 50,
    };
  }

  return {
    platform,
    predictedScore: 0,
  };
}
