/**
 * B-Roll Matchmaker: build scene list from script_content (deterministic heuristics).
 * Keywords: simple noun-ish extraction (words 4+ chars, skip common stop words).
 */

export type BrollScene = {
  idx: number;
  line: string;
  keywords: string[];
  pexels_query: string;
  selected_video_url?: string | null;
  /** From Pexels: thumbnail for UI */
  candidates?: Array<{
    video_url: string;
    thumbnail_url: string;
    width?: number;
    height?: number;
  }>;
};

const STOP_WORDS = new Set([
  'that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'what', 'when',
  'your', 'will', 'would', 'could', 'should', 'about', 'which', 'their', 'there',
  'them', 'then', 'some', 'into', 'more', 'other', 'only', 'just', 'also', 'than',
  'very', 'back', 'after', 'most', 'make', 'like', 'where', 'much', 'before', 'these',
]);

/** Extract keyword-like tokens (4+ chars, not stop words, alphabetic). */
export function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && /^[a-z]+$/.test(w) && !STOP_WORDS.has(w));
  return [...new Set(words)].slice(0, 5);
}

/** Build 6–10 scenes from script_content (hook + meat beats + optional cta). */
export function buildSceneList(script: {
  hook?: string;
  meat?: string[];
  cta?: string;
} | null, title: string): BrollScene[] {
  const scenes: BrollScene[] = [];
  let idx = 0;

  const add = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const keywords = extractKeywords(trimmed);
    const pexels_query = keywords.length > 0 ? keywords.slice(0, 3).join(' ') : trimmed.slice(0, 30).replace(/\s+/g, ' ');
    scenes.push({
      idx,
      line: trimmed,
      keywords,
      pexels_query: pexels_query || 'nature',
    });
    idx += 1;
  };

  if (!script) {
    add(title || 'Intro');
    return scenes;
  }

  if (script.hook?.trim()) {
    add(script.hook.trim());
  }

  const meat = Array.isArray(script.meat) ? script.meat : [];
  for (const beat of meat) {
    const parts = (beat as string).split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (scenes.length >= 10) break;
      add(p);
    }
  }
  if (scenes.length < 6 && meat.length > 0) {
    meat.forEach((b) => add(b as string));
  }

  if (script.cta?.trim() && scenes.length < 10) {
    add(script.cta.trim());
  }

  if (scenes.length === 0) {
    add(title || 'Content');
  }

  const result = scenes.slice(0, 10);
  result.forEach((s, i) => { s.idx = i; });
  return result;
}

export type PexelsVideoCandidate = {
  video_url: string;
  thumbnail_url: string;
  width?: number;
  height?: number;
};

/** Fetch top 3 Pexels video candidates for a query. Returns [] if no key or error. */
export async function fetchPexelsCandidates(
  query: string,
  apiKey: string | undefined,
  perPage = 3
): Promise<PexelsVideoCandidate[]> {
  if (!apiKey?.trim()) return [];
  const q = encodeURIComponent((query || 'nature').trim().slice(0, 100));
  const url = `https://api.pexels.com/videos/search?query=${q}&per_page=${perPage}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { videos?: Array<{
      image?: string;
      video_files?: Array<{ link: string; width?: number; height?: number; quality?: string }>;
    }> };
    const videos = data.videos ?? [];
    const out: PexelsVideoCandidate[] = [];
    for (const v of videos.slice(0, perPage)) {
      const link = v.video_files?.find((f) => f.quality === 'hd')?.link
        ?? v.video_files?.find((f) => f.quality === 'sd')?.link
        ?? v.video_files?.[0]?.link;
      if (link) {
        out.push({
          video_url: link,
          thumbnail_url: v.image ?? '',
          width: v.video_files?.[0]?.width,
          height: v.video_files?.[0]?.height,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}
