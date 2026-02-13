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

const titles = [
  'Why Dads Need Kettlebells',
  'Stop Doing Crunches — Try This Instead',
  'The Dad Bod Fix in 15 Minutes',
  '5 Exercises Every Busy Dad Should Do',
  'The Truth About Dad Bod',
  'Why I Quit the Gym (And You Should Too)',
  'The 10-Minute Dad Workout That Actually Works',
  'Stop Making Excuses — Start With One Push-Up',
  'Kettlebells vs Dumbbells for Busy Dads',
  'How I Lost 20 lbs Without a Gym',
  'POV: Your Wife Catches You Mid-Workout',
  'The One Exercise That Changed Everything',
];

const ideas = [
  '[DEMO] Why Dads Need Kettlebells',
  '[DEMO] Stop Doing Crunches — Try This Instead',
  '[DEMO] The Dad Bod Fix in 15 Minutes',
  '[DEMO] 5 Exercises Every Busy Dad Should Do',
  '[DEMO] The Truth About Dad Bod',
  '[DEMO] Why I Quit the Gym (And You Should Too)',
];

const DEMO_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

const scriptContent = {
  hook: 'If you only have 10 minutes, do these 5 moves.',
  meat: [
    'Goblet squats — build legs and core.',
    'Push-ups — no equipment needed.',
    'Kettlebell swings — full body burn.',
  ],
  cta: 'Save this and try it tomorrow.',
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
      platform: 'TikTok',
      caption: 'Fitness dads — demo post.',
      hashtags: ['fitness', 'dadlife', 'demo'],
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
