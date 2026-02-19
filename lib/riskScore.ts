/**
 * Risk scoring for Clip It (copyright / account-ban risk).
 * MVP heuristics; demo mode returns deterministic mock.
 */

export type RiskLevel = 'low' | 'medium' | 'high';
export type RecommendedAction = 'remake' | 'clip';

export type RiskScoreInput = {
  sourceUrl: string;
  platformTarget?: string;
  /** Optional: title/description from source (YouTube etc.) for heuristics */
  title?: string;
  description?: string;
  channelName?: string;
  /** Optional: whether channel is the uploader (false = repost channel) */
  isUploaderChannel?: boolean;
  /** Optional: thumbnail URL for basic heuristic (e.g. TV/movie frame pattern) */
  thumbnailUrl?: string;
};

export type RiskScoreResult = {
  level: RiskLevel;
  reasons: string[];
  recommendedAction: RecommendedAction;
};

const STRICT_PLATFORMS = ['tiktok', 'instagram', 'ig', 'reels', 'shorts'];
const RISKY_TITLE_PATTERNS = [
  /reupload/i,
  /no copyright/i,
  /movie scene/i,
  /tv show/i,
  /clip from/i,
  /copyright free/i,
  /ncs release/i,
  /full movie/i,
  /full episode/i,
];
const BIG_LABEL_HINTS = [
  /official (movie|film|tv)/i,
  /netflix|hbo|disney|warner|paramount|universal/i,
  /©\s*\d{4}/i,
];

/** Mulberry32 for deterministic demo scoring */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Returns risk score for a source URL (and optional metadata).
 * Demo mode: deterministic mock based on sourceUrl.
 */
export function computeRiskScore(input: RiskScoreInput): RiskScoreResult {
  const isDemo =
    typeof process !== 'undefined' &&
    (process.env?.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env?.NEXT_PUBLIC_DEMO_MODE === '1');

  if (isDemo) {
    const seed = simpleHash(input.sourceUrl + (input.platformTarget ?? ''));
    const rng = mulberry32(seed);
    const roll = rng();
    const level: RiskLevel =
      roll < 0.4 ? 'low' : roll < 0.75 ? 'medium' : 'high';
    const reasons: string[] = [];
    if (level === 'high') {
      reasons.push('Demo: simulated high-risk source');
      reasons.push('Source may be reupload or third-party content');
    } else if (level === 'medium') {
      reasons.push('Demo: simulated medium-risk source');
      reasons.push('Target platform (TikTok/IG) has stricter enforcement');
    } else {
      reasons.push('Demo: simulated low-risk source');
    }
    return {
      level,
      reasons,
      recommendedAction: level === 'low' ? 'clip' : 'remake',
    };
  }

  const reasons: string[] = [];
  let score = 0;

  const title = (input.title ?? '').trim();
  const desc = (input.description ?? '').trim();
  const combined = `${title} ${desc}`;

  for (const pattern of RISKY_TITLE_PATTERNS) {
    if (pattern.test(combined)) {
      score += 2;
      reasons.push('Title/description suggests reupload or copyrighted content');
      break;
    }
  }

  const channel = (input.channelName ?? '').trim();
  for (const hint of BIG_LABEL_HINTS) {
    if (hint.test(channel)) {
      score += 2;
      reasons.push('Channel appears to be a major media or official outlet');
      break;
    }
  }

  if (input.isUploaderChannel === false) {
    score += 2;
    reasons.push('YouTube channel may not be the original uploader');
  }

  if (input.thumbnailUrl) {
    const thumbLower = input.thumbnailUrl.toLowerCase();
    if (
      thumbLower.includes('movie') ||
      thumbLower.includes('tv') ||
      thumbLower.includes('film') ||
      /s\d{2}e\d{2}/i.test(thumbLower)
    ) {
      score += 1;
      reasons.push('Thumbnail suggests TV/movie content');
    }
  }

  const platform = (input.platformTarget ?? '').toLowerCase();
  if (STRICT_PLATFORMS.some((p) => platform.includes(p))) {
    score += 1;
    reasons.push('Target platform (TikTok/IG) enforces copyright more strictly');
  }

  let level: RiskLevel = 'low';
  if (score >= 4) level = 'high';
  else if (score >= 2) level = 'medium';

  if (reasons.length === 0 && level === 'low') {
    reasons.push('No high-risk signals detected');
  }

  return {
    level,
    reasons,
    recommendedAction: level === 'low' ? 'clip' : 'remake',
  };
}
