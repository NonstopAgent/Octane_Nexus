export type Platform = 'tiktok' | 'instagram' | 'x';

export type TrendingHashtag = {
  tag: string;
  platform: Platform;
  category: string;
  trend_score: number; // 1-100 scale for urgency/velocity
  description?: string;
};

// Hard-coded high-value trending hashtags across platforms
// These will be replaced with automated scraping later
export const TRENDING_HASHTAGS: TrendingHashtag[] = [
  // TikTok Trending
  { tag: '#viral', platform: 'tiktok', category: 'General', trend_score: 95, description: 'Highest velocity content' },
  { tag: '#fyp', platform: 'tiktok', category: 'Algorithm', trend_score: 98, description: 'For You Page boost' },
  { tag: '#foryou', platform: 'tiktok', category: 'Algorithm', trend_score: 97, description: 'Algorithm discovery' },
  { tag: '#trending', platform: 'tiktok', category: 'General', trend_score: 92, description: 'Current trending content' },
  { tag: '#comedy', platform: 'tiktok', category: 'Entertainment', trend_score: 89, description: 'Humor-driven content' },
  { tag: '#dance', platform: 'tiktok', category: 'Entertainment', trend_score: 88, description: 'Dance challenges and trends' },
  { tag: '#fitness', platform: 'tiktok', category: 'Lifestyle', trend_score: 87, description: 'Workout and health content' },
  { tag: '#cooking', platform: 'tiktok', category: 'Lifestyle', trend_score: 86, description: 'Food and recipe content' },
  { tag: '#business', platform: 'tiktok', category: 'Professional', trend_score: 85, description: 'Entrepreneurship content' },
  { tag: '#motivation', platform: 'tiktok', category: 'Lifestyle', trend_score: 84, description: 'Inspirational content' },
  { tag: '#travel', platform: 'tiktok', category: 'Lifestyle', trend_score: 83, description: 'Travel experiences' },
  { tag: '#skincare', platform: 'tiktok', category: 'Beauty', trend_score: 82, description: 'Beauty and skincare tips' },
  { tag: '#fashion', platform: 'tiktok', category: 'Beauty', trend_score: 81, description: 'Style and fashion trends' },
  { tag: '#booktok', platform: 'tiktok', category: 'Entertainment', trend_score: 80, description: 'Book recommendations' },
  { tag: '#petsoftiktok', platform: 'tiktok', category: 'Entertainment', trend_score: 79, description: 'Pet content' },
  { tag: '#tech', platform: 'tiktok', category: 'Professional', trend_score: 78, description: 'Technology news and tips' },
  { tag: '#finance', platform: 'tiktok', category: 'Professional', trend_score: 77, description: 'Money and investing tips' },
  { tag: '#selfcare', platform: 'tiktok', category: 'Lifestyle', trend_score: 76, description: 'Mental health and wellness' },
  { tag: '#home', platform: 'tiktok', category: 'Lifestyle', trend_score: 75, description: 'Home decor and DIY' },
  { tag: '#pov', platform: 'tiktok', category: 'Entertainment', trend_score: 90, description: 'Point of view content' },

  // Instagram Trending
  { tag: '#instagood', platform: 'instagram', category: 'General', trend_score: 88, description: 'Quality content marker' },
  { tag: '#photooftheday', platform: 'instagram', category: 'Visual', trend_score: 85, description: 'Daily photography' },
  { tag: '#beautiful', platform: 'instagram', category: 'Visual', trend_score: 84, description: 'Aesthetic content' },
  { tag: '#fashion', platform: 'instagram', category: 'Beauty', trend_score: 87, description: 'Style inspiration' },
  { tag: '#lifestyle', platform: 'instagram', category: 'Lifestyle', trend_score: 86, description: 'Daily life content' },
  { tag: '#travel', platform: 'instagram', category: 'Lifestyle', trend_score: 89, description: 'Travel photography' },
  { tag: '#food', platform: 'instagram', category: 'Lifestyle', trend_score: 83, description: 'Food photography' },
  { tag: '#fitness', platform: 'instagram', category: 'Lifestyle', trend_score: 85, description: 'Health and wellness' },
  { tag: '#motivation', platform: 'instagram', category: 'Lifestyle', trend_score: 82, description: 'Inspirational quotes' },
  { tag: '#art', platform: 'instagram', category: 'Creative', trend_score: 81, description: 'Artistic content' },
  { tag: '#photography', platform: 'instagram', category: 'Creative', trend_score: 80, description: 'Photography skills' },
  { tag: '#nature', platform: 'instagram', category: 'Visual', trend_score: 79, description: 'Nature photography' },
  { tag: '#business', platform: 'instagram', category: 'Professional', trend_score: 84, description: 'Business content' },
  { tag: '#entrepreneur', platform: 'instagram', category: 'Professional', trend_score: 83, description: 'Startup content' },
  { tag: '#wellness', platform: 'instagram', category: 'Lifestyle', trend_score: 78, description: 'Health and wellness' },
  { tag: '#inspiration', platform: 'instagram', category: 'Lifestyle', trend_score: 77, description: 'Inspirational content' },
  { tag: '#vibes', platform: 'instagram', category: 'General', trend_score: 76, description: 'Aesthetic mood' },
  { tag: '#ootd', platform: 'instagram', category: 'Beauty', trend_score: 75, description: 'Outfit of the day' },
  { tag: '#home', platform: 'instagram', category: 'Lifestyle', trend_score: 74, description: 'Home decor' },
  { tag: '#brand', platform: 'instagram', category: 'Professional', trend_score: 73, description: 'Brand building' },

  // X (Twitter) Trending
  { tag: '#Tech', platform: 'x', category: 'Professional', trend_score: 90, description: 'Technology discussions' },
  { tag: '#Crypto', platform: 'x', category: 'Professional', trend_score: 88, description: 'Cryptocurrency news' },
  { tag: '#AI', platform: 'x', category: 'Professional', trend_score: 95, description: 'Artificial intelligence' },
  { tag: '#Startup', platform: 'x', category: 'Professional', trend_score: 85, description: 'Entrepreneurship' },
  { tag: '#Productivity', platform: 'x', category: 'Lifestyle', trend_score: 82, description: 'Efficiency tips' },
  { tag: '#Leadership', platform: 'x', category: 'Professional', trend_score: 84, description: 'Management insights' },
  { tag: '#Marketing', platform: 'x', category: 'Professional', trend_score: 87, description: 'Marketing strategies' },
  { tag: '#Writing', platform: 'x', category: 'Creative', trend_score: 81, description: 'Writing tips and threads' },
  { tag: '#Design', platform: 'x', category: 'Creative', trend_score: 80, description: 'Design inspiration' },
  { tag: '#Finance', platform: 'x', category: 'Professional', trend_score: 86, description: 'Financial advice' },
  { tag: '#Business', platform: 'x', category: 'Professional', trend_score: 89, description: 'Business insights' },
  { tag: '#Innovation', platform: 'x', category: 'Professional', trend_score: 83, description: 'Innovative ideas' },
  { tag: '#Growth', platform: 'x', category: 'Professional', trend_score: 82, description: 'Personal development' },
  { tag: '#Mindset', platform: 'x', category: 'Lifestyle', trend_score: 79, description: 'Mental models' },
  { tag: '#Creator', platform: 'x', category: 'Professional', trend_score: 88, description: 'Creator economy' },
  { tag: '#Community', platform: 'x', category: 'General', trend_score: 77, description: 'Community building' },
  { tag: '#Strategy', platform: 'x', category: 'Professional', trend_score: 85, description: 'Strategic thinking' },
  { tag: '#Trending', platform: 'x', category: 'General', trend_score: 92, description: 'Current discussions' },
  { tag: '#News', platform: 'x', category: 'General', trend_score: 91, description: 'Breaking news' },
  { tag: '#Thread', platform: 'x', category: 'Content Format', trend_score: 90, description: 'Twitter threads' },
];

export function getTrendingHashtags(platform?: Platform): TrendingHashtag[] {
  if (platform) {
    return TRENDING_HASHTAGS.filter(tag => tag.platform === platform)
      .sort((a, b) => b.trend_score - a.trend_score);
  }
  return [...TRENDING_HASHTAGS].sort((a, b) => b.trend_score - a.trend_score);
}

export function getTrendingByCategory(category: string, platform?: Platform): TrendingHashtag[] {
  let filtered = TRENDING_HASHTAGS.filter(tag => tag.category === category);
  if (platform) {
    filtered = filtered.filter(tag => tag.platform === platform);
  }
  return filtered.sort((a, b) => b.trend_score - a.trend_score);
}

export function searchTrendingHashtags(query: string): TrendingHashtag[] {
  const lowerQuery = query.toLowerCase();
  return TRENDING_HASHTAGS.filter(tag =>
    tag.tag.toLowerCase().includes(lowerQuery) ||
    tag.category.toLowerCase().includes(lowerQuery) ||
    tag.description?.toLowerCase().includes(lowerQuery)
  ).sort((a, b) => b.trend_score - a.trend_score);
}
