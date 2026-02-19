/**
 * Deterministic demo data seeding. Uses fixed seed so repeated runs yield same data.
 * Tag demo rows: content_posts/saved_blueprints use [DEMO] prefix; profile_analytics_history
 * and instagram_posts IDs are stored in demo_seeded_ids for reset.
 */

const DEMO_SEED = 42;

/** Mulberry32 - deterministic RNG */
function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tradeview AI brand identity for demo mode */
export const DEMO_BRAND = {
  name: 'Tradeview AI',
  niche: 'ai trading & market insights',
  platform: 'instagram',
  voice: 'confident, data-driven, direct',
};

const titles = [
  'Why Most Traders Ignore This One Signal',
  'AI vs Gut Feel — Which Wins in Volatile Markets?',
  '3 Chart Patterns AI Catches Before You Do',
  'The Fed Decision Playbook: What Smart Money Does',
  'How AI Reads Sentiment Before the Market Opens',
  'Stop Guessing Entries — Let Data Decide',
  'The 5-Minute Pre-Market Scan That Changed My P&L',
  'Options Flow Decoded: What the Whales Are Buying',
  'Why 90% of Retail Traders Lose (And How AI Flips It)',
  'Building a Trading Edge With Pattern Recognition',
  'POV: You Let AI Pick Your Entries for a Week',
  'The One Indicator That Actually Predicts Reversals',
];

const ideas = [
  '[DEMO] Why Most Traders Ignore This One Signal',
  '[DEMO] AI vs Gut Feel — Which Wins?',
  '[DEMO] 3 Chart Patterns AI Catches First',
  '[DEMO] The Fed Decision Playbook',
  '[DEMO] How AI Reads Sentiment Pre-Market',
  '[DEMO] Stop Guessing Entries — Use Data',
];

const DEMO_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

const scriptContent = {
  hook: 'Most traders miss this signal every single morning.',
  meat: [
    'AI scans 10,000 tickers before market open.',
    'Pattern recognition spots setups humans miss.',
    'Sentiment analysis from social + news feeds confirms bias.',
  ],
  cta: 'Follow for daily AI-powered market insights.',
};

export const POST_STATUS = {
  IDEA: 'idea',
  SCRIPTING: 'scripting',
  FILMING: 'filming',
  READY: 'ready',
  SCHEDULED: 'scheduled',
  POSTED: 'posted',
  GENERATING: 'generating',
} as const;

export type DemoSeedResult = {
  contentPostIds: string[];
  savedBlueprintIds: string[];
  profileAnalyticsIds: string[];
  instagramPostIds: string[];
};

export function buildDemoContentPosts(userId: string, now: string, nextWeekIso: string): Array<Record<string, unknown>> {
  const rng = mulberry32(DEMO_SEED);
  const used = new Set<number>();
  const pick = (max: number) => {
    let i = Math.floor(rng() * max);
    while (used.has(i)) i = (i + 1) % max;
    used.add(i);
    return i;
  };

  const rows: Array<Record<string, unknown>> = [];
  // 2 idea
  for (let k = 0; k < 2; k++) {
    const i = pick(titles.length);
    rows.push({
      user_id: userId,
      title: `[DEMO] ${titles[i]}`,
      script_content: null,
      status: POST_STATUS.IDEA,
      created_at: now,
      updated_at: now,
    });
  }
  // 2 scripting
  for (let k = 0; k < 2; k++) {
    const i = pick(titles.length);
    rows.push({
      user_id: userId,
      title: `[DEMO] ${titles[i]}`,
      script_content: scriptContent,
      status: POST_STATUS.SCRIPTING,
      created_at: now,
      updated_at: now,
    });
  }
  // 2 filming
  for (let k = 0; k < 2; k++) {
    const i = pick(titles.length);
    rows.push({
      user_id: userId,
      title: `[DEMO] ${titles[i]}`,
      script_content: scriptContent,
      status: POST_STATUS.FILMING,
      background_video_url: DEMO_VIDEO_URL,
      created_at: now,
      updated_at: now,
    });
  }
  // 3 ready (Post Lab queue)
  for (let k = 0; k < 3; k++) {
    const i = pick(titles.length);
    rows.push({
      user_id: userId,
      title: `[DEMO] ${titles[i]}`,
      script_content: scriptContent,
      status: POST_STATUS.READY,
      final_video_url: DEMO_VIDEO_URL,
      background_video_url: DEMO_VIDEO_URL,
      created_at: now,
      updated_at: now,
    });
  }
  // 2 scheduled
  for (let k = 0; k < 2; k++) {
    const i = pick(titles.length);
    rows.push({
      user_id: userId,
      title: `[DEMO] ${titles[i]}`,
      script_content: scriptContent,
      status: POST_STATUS.SCHEDULED,
      final_video_url: DEMO_VIDEO_URL,
      scheduled_date: nextWeekIso,
      platform: 'Reels',
      caption: 'AI-powered market analysis — Tradeview AI demo.',
      hashtags: ['trading', 'ai', 'marketanalysis', 'tradeviewai'],
      created_at: now,
      updated_at: now,
    });
  }
  return rows;
}

export function buildDemoSavedBlueprints(userId: string, now: string): Array<Record<string, unknown>> {
  const blueprint = {
    hook: scriptContent.hook,
    meat: scriptContent.meat,
    cta: scriptContent.cta,
  };
  return ideas.map((idea) => ({
    user_id: userId,
    idea,
    created_at: now,
    blueprint,
  }));
}

export function buildDemoProfileAnalyticsHistory(userId: string): Array<{ user_id: string; platform: string; follower_count: number; recorded_at: string }> {
  const rng = mulberry32(DEMO_SEED + 1);
  const base = 12000 + Math.floor(rng() * 3000);
  const rows: Array<{ user_id: string; platform: string; follower_count: number; recorded_at: string }> = [];
  const platform = 'instagram';
  for (let d = 0; d < 14; d++) {
    const date = new Date();
    date.setDate(date.getDate() - (13 - d));
    date.setUTCHours(12, 0, 0, 0);
    const growth = 1 + (d / 14) * 0.15;
    rows.push({
      user_id: userId,
      platform,
      follower_count: Math.round(base * growth + rng() * 200),
      recorded_at: date.toISOString(),
    });
  }
  return rows;
}

export function buildDemoInstagramPosts(userId: string): Array<Record<string, unknown>> {
  const rng = mulberry32(DEMO_SEED + 2);
  const scores = [72, 78, 85, 68, 91];
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (4 - i));
    date.setUTCHours(14, 0, 0, 0);
    rows.push({
      user_id: userId,
      media_type: 'reel',
      media_urls: [],
      caption: '[DEMO]',
      quality_score: scores[Math.floor(rng() * scores.length)],
      status: 'posted',
      posted_at: date.toISOString(),
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    });
  }
  return rows;
}

export function getNextWeekIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(14, 0, 0, 0);
  return d.toISOString();
}

const STYLE_PRESETS = [
  {
    name: 'Direct',
    tokens: {
      caption_style: { maxLines: 5 },
      intro_pattern: { enabled: true, textTemplate: 'Here\'s what you need to know about {title}.' },
      cta_pattern: { enabled: true, template: 'Follow for more.' },
      pacing: { maxSentenceLength: 20 },
    },
  },
  {
    name: 'Hype',
    tokens: {
      caption_style: { maxLines: 8 },
      intro_pattern: { enabled: true, textTemplate: 'STOP scrolling — {title} 🔥' },
      cta_pattern: { enabled: true, template: 'Drop a 🔥 if you agree!' },
      pacing: { maxSentenceLength: 15 },
    },
  },
  {
    name: 'Calm',
    tokens: {
      caption_style: { maxLines: 6 },
      intro_pattern: { enabled: true, textTemplate: 'A quick thought on {title}.' },
      cta_pattern: { enabled: true, template: 'Save this for later.' },
      pacing: { maxSentenceLength: 25 },
    },
  },
  {
    name: 'Authority',
    tokens: {
      caption_style: { maxLines: 4 },
      intro_pattern: { enabled: true, textTemplate: 'The truth about {title} (from someone who\'s done it).' },
      cta_pattern: { enabled: true, template: 'DM "START" for my free guide.' },
      pacing: { maxSentenceLength: 18 },
    },
  },
];

export function buildDemoStyleTokens(userId: string): Array<Record<string, unknown>> {
  return STYLE_PRESETS.map((p, i) => ({
    user_id: userId,
    name: `[DEMO] ${p.name}`,
    tokens: p.tokens,
    is_default: i === 0,
  }));
}
