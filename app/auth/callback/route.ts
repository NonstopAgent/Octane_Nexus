import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const returnTo = requestUrl.searchParams.get('returnTo') || '/identity';

  if (code) {
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { ...options })
              );
            } catch {
              // Ignored — middleware will handle session refresh
            }
          },
        },
      });

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}&returnTo=${encodeURIComponent(returnTo)}`, requestUrl.origin)
        );
      }

      // Session is now stored in cookies — redirect to destination
      return NextResponse.redirect(new URL(returnTo, requestUrl.origin));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      console.error('Error in auth callback:', err);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(message)}&returnTo=${encodeURIComponent(returnTo)}`, requestUrl.origin)
      );
    }
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, requestUrl.origin));
}
