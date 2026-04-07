import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
}

if (SUPABASE_URL.includes('your-project-ref') || SUPABASE_ANON_KEY.includes('your-anon-key')) {
  throw new Error(
    'Supabase credentials are placeholders. Get your real values from https://supabase.com/dashboard → your project → Settings → API (Project URL and anon public key), then update .env.local.'
  );
}

/**
 * Browser Supabase client.
 * Uses @supabase/auth-helpers-nextjs to match the middleware and
 * SupabaseSessionProvider, so cookies are written/read in the same
 * format across the entire app.
 *
 * DO NOT switch to @supabase/ssr’s createBrowserClient — it writes
 * cookies in a different format and the middleware will fail to
 * parse them, silently dropping sessions and bouncing users back
 * to /login after successful sign-in.
 */
export const supabase = createClientComponentClient();

