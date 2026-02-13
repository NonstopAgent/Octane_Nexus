import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
}

if (SUPABASE_URL.includes('your-project-ref') || SUPABASE_ANON_KEY.includes('your-anon-key')) {
  throw new Error(
    'Supabase credentials are placeholders. Get your real values from https://supabase.com/dashboard → your project → Settings → API (Project URL and anon public key), then update .env.local.'
  );
}

/**
 * Browser Supabase client. Uses cookies so the server can read the session.
 * Do NOT use createClient from @supabase/supabase-js - it stores in localStorage
 * and the server will never see the session (causing redirect loops).
 */
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

