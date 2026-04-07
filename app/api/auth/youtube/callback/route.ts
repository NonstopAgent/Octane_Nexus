import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeCodeForTokens,
  fetchYouTubeChannel,
  getServiceRoleClient,
} from '@/lib/youtubeOAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/youtube/callback
 * Handles the redirect back from Google OAuth.
 * Verifies CSRF state, exchanges the auth code for tokens,
 * fetches the user's channel, and stores everything in
 * creator_connections via the service role client.
 */
export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const settingsUrl = new URL('/dashboard/settings', siteUrl);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // User denied consent or Google returned an error
    if (error) {
      settingsUrl.searchParams.set('youtube', 'error');
      settingsUrl.searchParams.set('reason', error);
      return NextResponse.redirect(settingsUrl);
    }

    if (!code || !state) {
      settingsUrl.searchParams.set('youtube', 'error');
      settingsUrl.searchParams.set('reason', 'missing_params');
      return NextResponse.redirect(settingsUrl);
    }

    // Verify CSRF state against the cookie we set in /start
    const cookieStore = cookies();
    const cookieState = cookieStore.get('youtube_oauth_state')?.value;
    const userId = cookieStore.get('youtube_oauth_user')?.value;

    if (!cookieState || cookieState !== state) {
      settingsUrl.searchParams.set('youtube', 'error');
      settingsUrl.searchParams.set('reason', 'state_mismatch');
      return NextResponse.redirect(settingsUrl);
    }
    if (!userId) {
      settingsUrl.searchParams.set('youtube', 'error');
      settingsUrl.searchParams.set('reason', 'no_user');
      return NextResponse.redirect(settingsUrl);
    }

    // Exchange the auth code for access + refresh tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch the user's YouTube channel so we have display data
    const channel = await fetchYouTubeChannel(tokens.access_token);
    if (!channel) {
      settingsUrl.searchParams.set('youtube', 'error');
      settingsUrl.searchParams.set('reason', 'no_channel');
      return NextResponse.redirect(settingsUrl);
    }

    // Store the connection via service role (tokens are sensitive — RLS-only writes)
    const admin = getServiceRoleClient();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await admin
      .from('creator_connections')
      .upsert({
        user_id: userId,
        provider: 'youtube',
        provider_account_id: channel.id,
        provider_username: channel.customUrl || null,
        provider_display_name: channel.title,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt,
        scope: tokens.scope,
        metadata: {
          subscriber_count: channel.subscriberCount || null,
          channel_title: channel.title,
        },
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      console.error('youtube/callback upsert error:', upsertError.message);
      settingsUrl.searchParams.set('youtube', 'error');
      settingsUrl.searchParams.set('reason', 'db_error');
      return NextResponse.redirect(settingsUrl);
    }

    // Clear the CSRF cookies
    cookieStore.delete('youtube_oauth_state');
    cookieStore.delete('youtube_oauth_user');

    // Redirect to settings with success flag
    settingsUrl.searchParams.set('youtube', 'connected');
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error('youtube/callback error:', err);
    settingsUrl.searchParams.set('youtube', 'error');
    settingsUrl.searchParams.set(
      'reason',
      err instanceof Error ? err.message.slice(0, 100) : 'unknown'
    );
    return NextResponse.redirect(settingsUrl);
  }
}
