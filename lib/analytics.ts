export type PlatformId = 'instagram' | 'youtube' | 'x' | 'tiktok';

export type PlatformMetricKey =
  | 'followers'
  | 'following'
  | 'subscribers'
  | 'views'
  | 'watchTimeHours'
  | 'ctr'
  | 'revenue'
  | 'accountsReached'
  | 'engagementRate'
  | 'reelPlays'
  | 'impressions'
  | 'profileVisits'
  | 'repliesMentions';

export type CardConfig = {
  id: string;
  title: string;
  metricKey: PlatformMetricKey;
  secondaryKey?: PlatformMetricKey;
};

export type PlatformConfig = {
  chartLabel: string;
  primaryMetricKey: PlatformMetricKey;
  topCards: CardConfig[];
};

export const PLATFORM_CONFIGS: Record<PlatformId, PlatformConfig> = {
  youtube: {
    chartLabel: 'Views & Retention',
    primaryMetricKey: 'views',
    topCards: [
      { id: 'subscribers', title: 'Subscribers', metricKey: 'subscribers' },
      { id: 'watchTime', title: 'Watch Time (hrs)', metricKey: 'watchTimeHours' },
      { id: 'ctr', title: 'CTR', metricKey: 'ctr' },
      { id: 'revenue', title: 'Revenue', metricKey: 'revenue' },
    ],
  },
  instagram: {
    chartLabel: 'Audience Reach & Engagement',
    primaryMetricKey: 'accountsReached',
    topCards: [
      { id: 'followers', title: 'Followers', metricKey: 'followers', secondaryKey: 'following' },
      { id: 'reach', title: 'Accounts Reached', metricKey: 'accountsReached' },
      { id: 'engagement', title: 'Engagement Rate', metricKey: 'engagementRate' },
      { id: 'reelPlays', title: 'Reel Plays', metricKey: 'reelPlays' },
    ],
  },
  x: {
    chartLabel: 'Tweet Impressions',
    primaryMetricKey: 'impressions',
    topCards: [
      { id: 'followers', title: 'Followers', metricKey: 'followers', secondaryKey: 'following' },
      { id: 'impressions', title: 'Impressions', metricKey: 'impressions' },
      { id: 'profileVisits', title: 'Profile Visits', metricKey: 'profileVisits' },
      { id: 'repliesMentions', title: 'Replies & Mentions', metricKey: 'repliesMentions' },
    ],
  },
  tiktok: {
    chartLabel: 'Views & Watch Time',
    primaryMetricKey: 'views',
    topCards: [
      { id: 'followers', title: 'Followers', metricKey: 'followers' },
      { id: 'views', title: 'Video Views', metricKey: 'views' },
      { id: 'engagement', title: 'Engagement Rate', metricKey: 'engagementRate' },
      { id: 'reelPlays', title: 'Video Completions', metricKey: 'reelPlays' },
    ],
  },
};

