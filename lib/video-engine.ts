/**
 * Video Engine - Quote Video style generation + Smart Background Picker.
 * MVP: Background selection by topic. Later: Remotion or API rendering.
 */

export type ClassifyTopicInput = {
  title?: string;
  hook?: string;
  meat?: string[];
  cta?: string;
};

export type ClassifyTopicResult = {
  category: string;
  keywords: string[];
  reason: string;
};

export type PickBackgroundResult = {
  background_video_url: string;
  background_reason: string;
  source: string;
  category: string;
};

// Deterministic keyword rules for topic classification
const CATEGORY_RULES: Array<{
  category: string;
  keywords: string[];
  label: string;
}> = [
  {
    category: 'cardio',
    keywords: ['run', 'running', 'jog', 'cardio', 'treadmill', 'hiit', 'sprint', 'marathon', 'endurance'],
    label: 'cardio/running',
  },
  {
    category: 'diet',
    keywords: ['diet', 'meal', 'cooking', 'food', 'protein', 'calorie', 'nutrition', 'prep', 'eat', 'recipe'],
    label: 'diet/meal prep',
  },
  {
    category: 'strength',
    keywords: ['lift', 'weights', 'gym', 'strength', 'bench', 'squat', 'deadlift', 'muscle', 'rep', 'exercise'],
    label: 'lifting/strength',
  },
  {
    category: 'recovery',
    keywords: ['recovery', 'stretch', 'rest', 'sleep', 'rest day', 'yoga', 'mobility', 'rest day', 'heal'],
    label: 'recovery',
  },
  {
    category: 'mindset',
    keywords: ['mindset', 'motivation', 'mental', 'discipline', 'habit', 'focus', 'mind', 'believe', 'mindset'],
    label: 'motivation/mindset',
  },
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

/**
 * Classify a post's topic from title/hook/meat/cta using deterministic keyword rules.
 */
export function classifyTopic(input: ClassifyTopicInput): ClassifyTopicResult {
  const parts: string[] = [];
  if (input.title) parts.push(input.title);
  if (input.hook) parts.push(input.hook);
  if (input.meat && Array.isArray(input.meat)) parts.push(...input.meat);
  if (input.cta) parts.push(input.cta);

  const combined = normalizeText(parts.join(' '));

  for (const rule of CATEGORY_RULES) {
    const found = rule.keywords.filter((kw) => combined.includes(kw));
    if (found.length > 0) {
      return {
        category: rule.category,
        keywords: found,
        reason: `Detected ${rule.label} keywords: ${found.join(', ')} → ${rule.label} background`,
      };
    }
  }

  return {
    category: 'general',
    keywords: [],
    reason: 'No specific category detected → general fitness background',
  };
}

/**
 * Hardcoded fallback MP4 URLs per category. Uses stable sample video URLs.
 * Each category maps to a different clip (Google sample bucket + verified Pexels).
 */
const FALLBACK_URLS: Record<string, string> = {
  strength:
    'https://videos.pexels.com/video-files/3195394/3195394-uhd_1440_2732_25fps.mp4',
  cardio:
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Volleyball.mp4',
  diet:
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  recovery:
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  mindset:
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  general:
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
};

export function getFallbackBackground(
  category: string
): { url: string; source: 'fallback' } {
  const safeCategory = category in FALLBACK_URLS ? category : 'general';
  return {
    url: FALLBACK_URLS[safeCategory],
    source: 'fallback',
  };
}

const PEXELS_QUERIES: Record<string, string> = {
  strength: 'man lifting weights gym workout',
  cardio: 'man running outdoor cardio',
  diet: 'healthy meal prep cooking kitchen',
  recovery: 'yoga stretching recovery',
  mindset: 'nature sunrise motivational',
  general: 'fitness workout gym',
};

/**
 * Fetch a background video from Pexels Video Search.
 * Returns null if PEXELS_API_KEY is missing or fetch fails.
 */
export async function fetchPexelsBackground(
  category: string
): Promise<{ url: string; source: 'pexels' } | null> {
  const apiKey =
    process.env.PEXELS_API_KEY || process.env.NEXT_PUBLIC_PEXELS_API_KEY;
  if (!apiKey?.trim()) return null;

  const query = PEXELS_QUERIES[category] || PEXELS_QUERIES.general;

  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&size=medium`,
      {
        headers: { Authorization: apiKey },
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      videos?: Array<{
        video_files?: Array<{
          link: string;
          quality?: string;
          width?: number;
          file_type?: string;
        }>;
      }>;
    };

    const videos = data?.videos;
    if (!videos?.length) return null;

    const video = videos[0];
    const files = video.video_files;
    if (!files?.length) return null;

    const mp4 = files.filter(
      (f) => (f.file_type || '').includes('mp4') || (f.link || '').includes('.mp4')
    );
    const candidates = mp4.length ? mp4 : files;
    const best =
      candidates.find((f) => f.quality === 'hd') ||
      candidates.find((f) => (f.width ?? 0) >= 1280) ||
      candidates[0];

    const link = best?.link;
    if (!link) return null;

    return { url: link, source: 'pexels' };
  } catch {
    return null;
  }
}

/**
 * Pick background for a post: classify topic, try Pexels, fallback to hardcoded.
 */
export async function pickBackgroundForPost(
  input: ClassifyTopicInput
): Promise<PickBackgroundResult> {
  const { category, reason } = classifyTopic(input);

  const pexels = await fetchPexelsBackground(category);
  if (pexels) {
    return {
      background_video_url: pexels.url,
      background_reason: `${reason} (via Pexels)`,
      source: pexels.source,
      category,
    };
  }

  const fallback = getFallbackBackground(category);
  return {
    background_video_url: fallback.url,
    background_reason: `${reason} (fallback)`,
    source: fallback.source,
    category,
  };
}

/**
 * Generate quote video. For now returns the backgroundUrl (data flow placeholder).
 * Later: Remotion or API rendering.
 */
export function generateQuoteVideo(args: {
  text: string;
  backgroundUrl: string;
}): string {
  return args.backgroundUrl;
}
