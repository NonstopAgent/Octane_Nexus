export interface UserIdentityProfile {
  niche: string;
  businessType: 'creator' | 'local_business' | 'ecommerce' | 'agency' | 'personal_brand';
  primaryGoal: 'growth' | 'sales' | 'authority' | 'community';
  platformFocus: ('instagram' | 'tiktok' | 'youtube')[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface UserBehaviorProfile {
  avgPostsPerWeek: number;
  dominantFormat?: string;
  avgCaptionLength?: number;
  avgHashtagCount?: number;
  commonPostingHours?: number[];
}

export interface UserPerformanceProfile {
  averagePredictedScore: number;
  averageActualScore: number;
  predictionBias: number;
  strongestPlatform?: string;
  weakestPlatform?: string;
  bestFormat?: string;
  weakestFormat?: string;
}

export interface NexusUserProfile {
  identity: UserIdentityProfile;
  behavior: UserBehaviorProfile;
  performance: UserPerformanceProfile;
}

// TODO: Future: audience demographic modeling, sentiment analysis of comments, follower growth velocity, risk tolerance modeling.
