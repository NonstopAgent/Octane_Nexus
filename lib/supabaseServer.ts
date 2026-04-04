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
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// Alias for backward compatibility with actions/ and api/ routes
export const createServerSupabaseClient = createSupabaseServerClient;
