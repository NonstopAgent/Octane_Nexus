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
  // Use the request's own origin — always correct in production, never falls
  // back to localhost. NEXT_PUBLIC_SITE_URL was unreliable across environments.
  const origin = new URL(req.url).origin;
  const memoryUrl = new URL('/dashboard/memory', origin);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // User denied consent or Google returned an error
    if (error) {
      memoryUrl.searchParams.set('youtube', 'error');
      memoryUrl.searchParams.set('reason', error);
      return NextResponse.redirect(memoryUrl);
    }

    if (!code || !state) {
      memoryUrl.searchParams.set('youtube', 'error');
      memoryUrl.searchParams.set('reason', 'missing_params');
      return NextResponse.redirect(memoryUrl);
    }

    // Verify CSRF state against the cookie we set in /start
    const cookieStore = cookies();
    const cookieState = cookieStore.get('youtube_oauth_state')?.value;
    const userId = cookieStore.get('youtube_oauth_user')?.value;

    if (!cookieState || cookieState !== state) {
      memoryUrl.searchParams.set('youtube', 'error');
      memoryUrl.searchParams.set('reason', 'state_mismatch');
      return NextResponse.redirect(memoryUrl);
    }
    if (!userId) {
      memoryUrl.searchParams.set('youtube', 'error');
      memoryUrl.searchParams.set('reason', 'no_user');
      return NextResponse.redirect(memoryUrl);
    }

    // Exchange the auth code for access + refresh tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch the user's YouTube channel so we have display data
    const channel = await fetchYouTubeChannel(tokens.access_token);
    if (!channel) {
      memoryUrl.searchParams.set('youtube', 'error');
      memoryUrl.searchParams.set('reason', 'no_channel');
      return NextResponse.redirect(memoryUrl);
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
      memoryUrl.searchParams.set('youtube', 'error');
      memoryUrl.searchParams.set('reason', 'db_error');
      return NextResponse.redirect(memoryUrl);
    }

    // Clear the CSRF cookies
    cookieStore.delete('youtube_oauth_state');
    cookieStore.delete('youtube_oauth_user');

    // Redirect to memory page with success flag
    memoryUrl.searchParams.set('youtube', 'connected');
    return NextResponse.redirect(memoryUrl);
  } catch (err) {
    console.error('youtube/callback error:', err);
    memoryUrl.searchParams.set('youtube', 'error');
    memoryUrl.searchParams.set(
      'reason',
      err instanceof Error ? err.message.slice(0, 100) : 'unknown'
    );
    return NextResponse.redirect(memoryUrl);
  }
}
