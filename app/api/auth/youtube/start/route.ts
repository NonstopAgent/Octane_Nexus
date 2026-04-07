import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { buildConsentUrl } from '@/lib/youtubeOAuth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/youtube/start
 * Initiates the Google OAuth flow for YouTube.
 * Generates a CSRF state token, stores it in a cookie, and redirects
 * to Google's consent screen.
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        new URL('/login?returnTo=/dashboard/settings', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      );
    }

    // CSRF state: random token stored in both cookie and OAuth state param
    const state = crypto.randomBytes(32).toString('hex');
    const cookieStore = cookies();
    cookieStore.set('youtube_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    // Also store the user id in the state cookie chain so the callback
    // can tie the tokens back to the right user
    cookieStore.set('youtube_oauth_user', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });

    const consentUrl = buildConsentUrl(state);
    return NextResponse.redirect(consentUrl);
  } catch (err) {
    console.error('youtube/start error:', err);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      new URL('/dashboard/settings?youtube=error&reason=config', siteUrl)
    );
  }
}
