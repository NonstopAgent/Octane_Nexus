import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for use in Route Handlers.
 * Uses @supabase/auth-helpers-nextjs to match the middleware and session provider.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

/**
 * Create a Supabase client with the service role key (bypasses RLS).
 * Use for admin operations only.
 *
 * `cache: 'no-store'` is load-bearing, not a precaution. Next.js patches the
 * global fetch and caches GET requests in the App Router, and PostgREST reads
 * are GETs — so without this a route handler silently reads a stale snapshot
 * of the database for the life of the cache entry.
 *
 * This was not theoretical. The brief worker claimed a job, finished it, then
 * re-read the queue, got the pre-finish snapshot back, and re-processed the
 * same user in a tight loop until its time budget ran out — seven Gemini calls
 * for one brief, every invocation. `dynamic = 'force-dynamic'` does not help:
 * it controls route rendering, not the fetch data cache.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  });
}

// Alias for backward compatibility with actions/ and api/ routes
export const createServerSupabaseClient = createSupabaseServerClient;
