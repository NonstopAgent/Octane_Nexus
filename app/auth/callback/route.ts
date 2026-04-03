import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const returnTo = requestUrl.searchParams.get('returnTo') || '/identity';

  if (code) {
    try {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}&returnTo=${encodeURIComponent(returnTo)}`, requestUrl.origin)
        );
      }

      return NextResponse.redirect(new URL(returnTo, requestUrl.origin));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      console.error('Error in auth callback:', err);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(message)}&returnTo=${encodeURIComponent(returnTo)}`, requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, requestUrl.origin));
}
