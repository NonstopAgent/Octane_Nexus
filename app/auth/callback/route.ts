import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zdvedfnpipgygvikoooa.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1EEA1MtGEqz8vWJAApQM6Q_FnjK-aaw';

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const returnTo = requestUrl.searchParams.get('returnTo') || '/identity';

  if (code) {
    // Create a server-side Supabase client for the callback
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    });

    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(error.message)}&returnTo=${encodeURIComponent(returnTo)}`, requestUrl.origin)
        );
      }

      if (data.user) {
        // Ensure profile exists
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email,
            },
            {
              onConflict: 'id',
            }
          );

        if (profileError) {
          console.error('Error creating/updating profile:', profileError);
          // Continue anyway, profile might already exist
        }

        // Redirect to the returnTo URL or dashboard
        return NextResponse.redirect(new URL(returnTo, requestUrl.origin));
      }
    } catch (err: any) {
      console.error('Error in auth callback:', err);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(err.message || 'Authentication failed')}&returnTo=${encodeURIComponent(returnTo)}`, requestUrl.origin)
      );
    }
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnTo)}`, requestUrl.origin));
}
