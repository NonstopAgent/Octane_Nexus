/**
 * Social Media Intelligence Engine
 * Fetches social stats and viral tactics (Viral Coach - NO software suggestions).
 */

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'x';

export type ViralPotential = 'High' | 'Very High';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Expert';

export type ViralTactic = {
  id: string;
  name: string;
  description: string;
  example: string;
  viral_potential: ViralPotential;
  difficulty: Difficulty;
};

/**
 * Get viral filming tactics for the niche. FORBIDDEN: software suggestions (Notion, etc).
 * Returns filming formats like "The Green Screen React", "The Loop", "The 3-Second Hook".
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- niche can filter tactics later
export async function getViralTactics(_niche: string): Promise<ViralTactic[]> {
  const tactics: ViralTactic[] = [
    {
      id: '1',
      name: 'The Green Screen React',
      description: 'Record yourself reacting to a trending clip or meme on green screen. Add your face and commentary for instant relatability.',
      example: 'Screen shows viral fail → You freeze-frame and deliver the punchline.',
      viral_potential: 'Very High',
      difficulty: 'Beginner',
    },
    {
      id: '2',
      name: 'The Loop',
      description: 'Create a satisfying loop where the end connects seamlessly to the start. Viewers watch multiple times to spot the loop.',
      example: 'Pour coffee → drink → cup refills → loop.',
      viral_potential: 'Very High',
      difficulty: 'Intermediate',
    },
    {
      id: '3',
      name: 'The 3-Second Hook',
      description: 'Open with a visual or audio grabber in the first 3 seconds. No intro, no "Hey guys"—just instant value or curiosity.',
      example: 'Person drops phone → picks up → "That\'s how I lost $10K."',
      viral_potential: 'Very High',
      difficulty: 'Beginner',
    },
    {
      id: '4',
      name: 'The POV Format',
      description: 'Film from first-person perspective. Viewer feels they are in the scene. Great for tutorials, reactions, and storytime.',
      example: 'POV: You open your front door and your dog has redecorated.',
      viral_potential: 'High',
      difficulty: 'Beginner',
    },
    {
      id: '5',
      name: 'The Duet/Stitch Bait',
      description: 'Create content designed to be duetted or stitched. Leave a clear moment for others to add their take.',
      example: 'Hot take → Cut to black → "Stitch this if you disagree."',
      viral_potential: 'Very High',
      difficulty: 'Intermediate',
    },
    {
      id: '6',
      name: 'The Screenshot Story',
      description: 'Use screenshots or text overlays to tell a story. Low production, high scroll-stop potential.',
      example: 'DM screenshot → Reaction → Plot twist in caption.',
      viral_potential: 'High',
      difficulty: 'Beginner',
    },
  ];
  return tactics.filter(() => true);
}

export type SocialStats = {
  followers: number;
  following: number;
  engagementRate: number;
  lastPostDate: string | null;
};

/**
 * Fetch social stats for a given platform and handle.
 * TODO: Connect Apify Client - swap mock with Apify actor for real data.
 * @param platform - Platform identifier
 * @param handle - Username or handle (with or without @)
 */
export async function fetchSocialStats(
  platform: Platform,
  handle: string
): Promise<SocialStats> {
  const cleanHandle = handle.replace(/^@/, '').toLowerCase();
  const seed = cleanHandle.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  // TODO: Connect Apify Client
  // const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN });
  // const run = await apifyClient.actor('apify/instagram-profile-scraper').call({ usernames: [cleanHandle] });
  // return mapApifyResultToSocialStats(run);

  // Mock: Realistic data that fluctuates based on date so charts look alive
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Base counts vary by platform and handle seed
  const baseFollowers = 500 + (seed % 5000) + platform.length * 1000;
  const dailyVariation = (dayOfYear + seed) % 7;
  const followers = baseFollowers + dailyVariation * 12 + Math.floor(Math.sin(dayOfYear * 0.1) * 50);
  const following = Math.min(
    Math.round(followers * (0.1 + (seed % 50) / 500)),
    7500
  );
  const engagementRate = 2.5 + (seed % 50) / 20 + Math.sin(dayOfYear * 0.2) * 0.5;
  const daysSincePost = (dayOfYear + seed) % 5;
  const lastPostDate =
    daysSincePost === 0
      ? null
      : new Date(now.getTime() - daysSincePost * 24 * 60 * 60 * 1000).toISOString();

  return {
    followers: Math.max(0, followers),
    following: Math.max(0, following),
    engagementRate: Math.round(engagementRate * 10) / 10,
    lastPostDate,
  };
}
