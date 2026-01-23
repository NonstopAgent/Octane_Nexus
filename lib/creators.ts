export type Platform = 'tiktok' | 'instagram' | 'x';

export type TopCreator = {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  followerCount: number; // in thousands
  niche: string;
  description?: string;
  growthRate?: number; // percentage
  avgEngagement?: number; // percentage
};

// Hard-coded high-value top creators across niches
// These will be replaced with automated scraping later
export const TOP_CREATORS: TopCreator[] = [
  // TikTok Creators
  { id: '1', name: 'Alex Hormozi', handle: '@alexhormozi', platform: 'tiktok', followerCount: 4500, niche: 'Business', description: 'Acquisition.com CEO, business education', growthRate: 15, avgEngagement: 8.5 },
  { id: '2', name: 'Ali Abdaal', handle: '@aliabdaal', platform: 'tiktok', followerCount: 1200, niche: 'Productivity', description: 'Doctor turned productivity YouTuber', growthRate: 12, avgEngagement: 7.2 },
  { id: '3', name: 'Gary Vaynerchuk', handle: '@garyvee', platform: 'tiktok', followerCount: 8200, niche: 'Business', description: 'Marketing expert, VaynerMedia CEO', growthRate: 8, avgEngagement: 6.8 },
  { id: '4', name: 'Dr. Karan Raj', handle: '@dr.karanr', platform: 'tiktok', followerCount: 2400, niche: 'Health', description: 'NHS surgeon, medical education', growthRate: 18, avgEngagement: 9.1 },
  { id: '5', name: 'Ryan Trahan', handle: '@ryantrahan', platform: 'tiktok', followerCount: 5600, niche: 'Entertainment', description: 'Penny series creator', growthRate: 10, avgEngagement: 7.5 },
  { id: '6', name: 'Charli D\'Amelio', handle: '@charlidamelio', platform: 'tiktok', followerCount: 152000, niche: 'Entertainment', description: 'Dance and lifestyle content', growthRate: 5, avgEngagement: 4.2 },
  { id: '7', name: 'Khaby Lame', handle: '@khaby.lame', platform: 'tiktok', followerCount: 162000, niche: 'Comedy', description: 'Reaction and comedy content', growthRate: 3, avgEngagement: 5.1 },
  { id: '8', name: 'MrBeast', handle: '@mrbeast', platform: 'tiktok', followerCount: 98000, niche: 'Entertainment', description: 'Challenge and giveaway content', growthRate: 7, avgEngagement: 8.9 },
  { id: '9', name: 'Bella Poarch', handle: '@bellapoarch', platform: 'tiktok', followerCount: 92000, niche: 'Entertainment', description: 'Music and lifestyle content', growthRate: 4, avgEngagement: 5.5 },
  { id: '10', name: 'Addison Rae', handle: '@addisonre', platform: 'tiktok', followerCount: 88000, niche: 'Entertainment', description: 'Dance and lifestyle content', growthRate: 6, avgEngagement: 6.2 },
  { id: '11', name: 'Dixie D\'Amelio', handle: '@dixiedamelio', platform: 'tiktok', followerCount: 57000, niche: 'Entertainment', description: 'Lifestyle and music content', growthRate: 5, avgEngagement: 5.8 },
  { id: '12', name: 'Loren Gray', handle: '@lorengray', platform: 'tiktok', followerCount: 54000, niche: 'Entertainment', description: 'Music and lifestyle content', growthRate: 4, avgEngagement: 5.2 },
  { id: '13', name: 'Baby Ariel', handle: '@babyariel', platform: 'tiktok', followerCount: 41000, niche: 'Entertainment', description: 'Music and dance content', growthRate: 3, avgEngagement: 4.8 },
  { id: '14', name: 'Zach King', handle: '@zachking', platform: 'tiktok', followerCount: 75000, niche: 'Entertainment', description: 'Magic and visual effects', growthRate: 8, avgEngagement: 7.3 },
  { id: '15', name: 'Michael Le', handle: '@justmaiko', platform: 'tiktok', followerCount: 52000, niche: 'Entertainment', description: 'Dance and choreography', growthRate: 6, avgEngagement: 6.1 },
  { id: '16', name: 'Riyaz Aly', handle: '@riyaz.14', platform: 'tiktok', followerCount: 45000, niche: 'Entertainment', description: 'Lip-sync and comedy content', growthRate: 5, avgEngagement: 5.5 },
  { id: '17', name: 'Will Smith', handle: '@willsmith', platform: 'tiktok', followerCount: 72000, niche: 'Entertainment', description: 'Actor and motivational content', growthRate: 9, avgEngagement: 8.1 },

  // Instagram Creators
  { id: '18', name: 'Cristiano Ronaldo', handle: '@cristiano', platform: 'instagram', followerCount: 648000, niche: 'Sports', description: 'Football legend, fitness inspiration', growthRate: 2, avgEngagement: 3.5 },
  { id: '19', name: 'Kylie Jenner', handle: '@kyliejenner', platform: 'instagram', followerCount: 400000, niche: 'Beauty', description: 'Beauty entrepreneur, lifestyle', growthRate: 1, avgEngagement: 2.8 },
  { id: '20', name: 'Lionel Messi', handle: '@leomessi', platform: 'instagram', followerCount: 500000, niche: 'Sports', description: 'Football icon, family content', growthRate: 2, avgEngagement: 4.1 },
  { id: '21', name: 'Selena Gomez', handle: '@selenagomez', platform: 'instagram', followerCount: 430000, niche: 'Entertainment', description: 'Singer and actress', growthRate: 1, avgEngagement: 3.2 },
  { id: '22', name: 'Dwayne Johnson', handle: '@therock', platform: 'instagram', followerCount: 397000, niche: 'Entertainment', description: 'Actor and motivational speaker', growthRate: 3, avgEngagement: 4.5 },
  { id: '23', name: 'Ariana Grande', handle: '@arianagrande', platform: 'instagram', followerCount: 380000, niche: 'Entertainment', description: 'Singer and performer', growthRate: 1, avgEngagement: 3.1 },
  { id: '24', name: 'Beyoncé', handle: '@beyonce', platform: 'instagram', followerCount: 320000, niche: 'Entertainment', description: 'Singer and businesswoman', growthRate: 1, avgEngagement: 3.8 },
  { id: '25', name: 'Kendall Jenner', handle: '@kendalljenner', platform: 'instagram', followerCount: 294000, niche: 'Fashion', description: 'Model and fashion icon', growthRate: 1, avgEngagement: 2.9 },
  { id: '26', name: 'Kim Kardashian', handle: '@kimkardashian', platform: 'instagram', followerCount: 364000, niche: 'Lifestyle', description: 'Reality TV star and entrepreneur', growthRate: 1, avgEngagement: 2.5 },
  { id: '27', name: 'Justin Bieber', handle: '@justinbieber', platform: 'instagram', followerCount: 293000, niche: 'Entertainment', description: 'Singer and performer', growthRate: 1, avgEngagement: 3.4 },
  { id: '28', name: 'Taylor Swift', handle: '@taylorswift', platform: 'instagram', followerCount: 280000, niche: 'Entertainment', description: 'Singer-songwriter', growthRate: 2, avgEngagement: 4.2 },
  { id: '29', name: 'Jennifer Lopez', handle: '@jlo', platform: 'instagram', followerCount: 253000, niche: 'Entertainment', description: 'Singer, actress, entrepreneur', growthRate: 1, avgEngagement: 3.0 },
  { id: '30', name: 'Nicki Minaj', handle: '@nickiminaj', platform: 'instagram', followerCount: 228000, niche: 'Entertainment', description: 'Rapper and performer', growthRate: 1, avgEngagement: 3.2 },
  { id: '31', name: 'Neymar Jr', handle: '@neymarjr', platform: 'instagram', followerCount: 220000, niche: 'Sports', description: 'Football star, lifestyle', growthRate: 2, avgEngagement: 4.0 },
  { id: '32', name: 'Miley Cyrus', handle: '@mileycyrus', platform: 'instagram', followerCount: 212000, niche: 'Entertainment', description: 'Singer and actress', growthRate: 1, avgEngagement: 3.5 },
  { id: '33', name: 'Katy Perry', handle: '@katyperry', platform: 'instagram', followerCount: 206000, niche: 'Entertainment', description: 'Singer and performer', growthRate: 1, avgEngagement: 3.1 },
  { id: '34', name: 'Zendaya', handle: '@zendaya', platform: 'instagram', followerCount: 184000, niche: 'Entertainment', description: 'Actress and fashion icon', growthRate: 2, avgEngagement: 4.3 },

  // X (Twitter) Creators
  { id: '35', name: 'Elon Musk', handle: '@elonmusk', platform: 'x', followerCount: 181000, niche: 'Tech', description: 'CEO of Tesla, SpaceX, X', growthRate: 5, avgEngagement: 12.5 },
  { id: '36', name: 'MrBeast', handle: '@MrBeast', platform: 'x', followerCount: 25000, niche: 'Entertainment', description: 'YouTube creator, philanthropy', growthRate: 8, avgEngagement: 9.2 },
  { id: '37', name: 'Alex Hormozi', handle: '@AlexHormozi', platform: 'x', followerCount: 3200, niche: 'Business', description: 'Acquisition.com CEO, business education', growthRate: 20, avgEngagement: 11.8 },
  { id: '38', name: 'Naval Ravikant', handle: '@naval', platform: 'x', followerCount: 2400, niche: 'Philosophy', description: 'AngelList founder, wisdom threads', growthRate: 15, avgEngagement: 10.5 },
  { id: '39', name: 'Paul Graham', handle: '@paulg', platform: 'x', followerCount: 1900, niche: 'Tech', description: 'Y Combinator co-founder', growthRate: 12, avgEngagement: 9.8 },
  { id: '40', name: 'Marc Andreessen', handle: '@pmarca', platform: 'x', followerCount: 1400, niche: 'Tech', description: 'a16z co-founder', growthRate: 10, avgEngagement: 8.9 },
  { id: '41', name: 'Balaji Srinivasan', handle: '@balajis', platform: 'x', followerCount: 850, niche: 'Tech', description: 'Network state, crypto thought leader', growthRate: 18, avgEngagement: 13.2 },
  { id: '42', name: 'Sahil Bloom', handle: '@SahilBloom', platform: 'x', followerCount: 2200, niche: 'Business', description: 'Growth strategies, wisdom threads', growthRate: 22, avgEngagement: 12.4 },
  { id: '43', name: 'Julian Shapiro', handle: '@Julian', platform: 'x', followerCount: 480, niche: 'Tech', description: 'Startup advice, writing tips', growthRate: 16, avgEngagement: 11.1 },
  { id: '44', name: 'Dickie Bush', handle: '@dickiebush', platform: 'x', followerCount: 380, niche: 'Writing', description: 'Writing strategies, thread templates', growthRate: 25, avgEngagement: 14.3 },
  { id: '45', name: 'David Perell', handle: '@david_perell', platform: 'x', followerCount: 320, niche: 'Writing', description: 'Writing school founder', growthRate: 19, avgEngagement: 12.0 },
  { id: '46', name: 'Shane Parrish', handle: '@ShaneAParrish', platform: 'x', followerCount: 1100, niche: 'Philosophy', description: 'Farnam Street, mental models', growthRate: 14, avgEngagement: 10.2 },
  { id: '47', name: 'Tim Ferriss', handle: '@tferriss', platform: 'x', followerCount: 2100, niche: 'Lifestyle', description: 'Author, 4-Hour Workweek', growthRate: 11, avgEngagement: 9.5 },
  { id: '48', name: 'Andrew Huberman', handle: '@hubermanlab', platform: 'x', followerCount: 1800, niche: 'Health', description: 'Neuroscientist, health optimization', growthRate: 13, avgEngagement: 10.8 },
  { id: '49', name: 'Ryan Holiday', handle: '@RyanHoliday', platform: 'x', followerCount: 750, niche: 'Philosophy', description: 'Stoic philosophy, author', growthRate: 17, avgEngagement: 11.5 },
  { id: '50', name: 'James Clear', handle: '@JamesClear', platform: 'x', followerCount: 1600, niche: 'Lifestyle', description: 'Atomic Habits author', growthRate: 16, avgEngagement: 11.2 },
];

export function getTopCreators(platform?: Platform): TopCreator[] {
  if (platform) {
    return TOP_CREATORS.filter(creator => creator.platform === platform)
      .sort((a, b) => b.followerCount - a.followerCount);
  }
  return [...TOP_CREATORS].sort((a, b) => b.followerCount - a.followerCount);
}

export function searchCreators(query: string): TopCreator[] {
  const lowerQuery = query.toLowerCase();
  return TOP_CREATORS.filter(creator =>
    creator.name.toLowerCase().includes(lowerQuery) ||
    creator.handle.toLowerCase().includes(lowerQuery) ||
    creator.niche.toLowerCase().includes(lowerQuery) ||
    creator.description?.toLowerCase().includes(lowerQuery)
  ).sort((a, b) => b.followerCount - a.followerCount);
}

export function getCreatorsByNiche(niche: string): TopCreator[] {
  return TOP_CREATORS.filter(creator =>
    creator.niche.toLowerCase() === niche.toLowerCase()
  ).sort((a, b) => b.followerCount - a.followerCount);
}
