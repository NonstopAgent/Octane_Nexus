/**
 * YouTube OAuth helpers
 * =====================
 * Wraps the Google OAuth 2.0 flow for the YouTube Data API.
 * All token storage goes through Supabase via the service role
 * client — tokens are NEVER exposed to the browser.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
].join(' ');

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
};

/**
 * Returns the configured OAuth client credentials.
 * Throws if missing — caller routes return a 500 with a helpful message.
 */
export function getOAuthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google OAuth not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI in Vercel env vars.'
    );
  }
  return { clientId, clientSecret, redirectUri };
}

/**
 * Service role Supabase client. Bypasses RLS — only use server-side
 * for OAuth token storage and admin reads/writes.
 */
export function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase service role config');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Build the Google OAuth 2.0 consent URL for the YouTube scopes.
 * The state param is a CSRF token the caller stores in a cookie.
 */
export function buildConsentUrl(state: string): string {
  const { clientId, redirectUri } = getOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline',
    prompt: 'consent', // ensures we get a refresh_token even on re-auth
    include_granted_scopes: 'true',
    state,
  });
  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${errText}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

/**
 * Refresh an expired access token using a stored refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getOAuthConfig();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

/**
 * Get the user's primary YouTube channel.
 */
export async function fetchYouTubeChannel(accessToken: string): Promise<{
  id: string;
  title: string;
  customUrl?: string;
  subscriberCount?: number;
} | null> {
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const data = await res.json();
  const channel = data?.items?.[0];
  if (!channel) return null;
  return {
    id: channel.id,
    title: channel.snippet?.title || '',
    customUrl: channel.snippet?.customUrl,
    subscriberCount: Number(channel.statistics?.subscriberCount) || undefined,
  };
}

export type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
};

/**
 * Fetch the user's most recent uploaded videos with statistics.
 * Returns up to `limit` videos (max 50 per call, default 50).
 */
export async function fetchYouTubeVideos(
  accessToken: string,
  limit = 50
): Promise<YouTubeVideo[]> {
  // Step 1: Get the user's uploads playlist ID
  const channelRes = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=contentDetails&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!channelRes.ok) throw new Error(`channels.list failed: ${channelRes.status}`);
  const channelData = await channelRes.json();
  const uploadsPlaylistId =
    channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  // Step 2: Get the most recent items in that playlist
  const maxResults = Math.min(Math.max(limit, 1), 50);
  const itemsRes = await fetch(
    `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!itemsRes.ok) throw new Error(`playlistItems.list failed: ${itemsRes.status}`);
  const itemsData = await itemsRes.json();
  const videoIds: string[] = (itemsData?.items || [])
    .map((it: { snippet?: { resourceId?: { videoId?: string } } }) => it.snippet?.resourceId?.videoId)
    .filter((id: string | undefined): id is string => Boolean(id));

  if (videoIds.length === 0) return [];

  // Step 3: Fetch statistics + full snippet for those videos
  const videosRes = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(',')}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!videosRes.ok) throw new Error(`videos.list failed: ${videosRes.status}`);
  const videosData = await videosRes.json();

  return (videosData?.items || []).map((v: {
    id: string;
    snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: { medium?: { url?: string } } };
    statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    contentDetails?: { duration?: string };
  }) => ({
    id: v.id,
    title: v.snippet?.title || '',
    description: v.snippet?.description || '',
    publishedAt: v.snippet?.publishedAt || '',
    thumbnailUrl: v.snippet?.thumbnails?.medium?.url || '',
    viewCount: Number(v.statistics?.viewCount) || 0,
    likeCount: Number(v.statistics?.likeCount) || 0,
    commentCount: Number(v.statistics?.commentCount) || 0,
    duration: v.contentDetails?.duration || '',
  }));
}
