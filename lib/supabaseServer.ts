import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for use in Route Handlers.
 * Uses @supabase/auth-helpers-nextjs to match the middleware and session provider.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}
