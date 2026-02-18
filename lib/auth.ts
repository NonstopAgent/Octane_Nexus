/**
 * Client-side auth helper: single source of truth for "effective" user id.
 * Use everywhere instead of only supabase.auth.getUser() so that:
 * - Real Supabase session is used when present
 * - Mock session (localhost cookie) is used when present
 * - Demo mode: when no session, returns demo user id so UI can show content (APIs must support demo user separately)
 */

import { getMockUser } from '@/lib/mockAuth';

/** User id used for demo mode when no real/mock session (server must accept this for API calls). */
export const DEMO_USER_ID = 'dev_admin';

export function isDemoMode(): boolean {
  if (typeof process === 'undefined' || !process.env) return false;
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === '1';
}

/**
 * Returns the effective user id for the current client context.
 * 1. Supabase user id (from auth.getUser())
 * 2. Mock user id (localhost cookie from mockAuth)
 * 3. If demo mode: DEMO_USER_ID so pages can show UI and call APIs that support demo user
 * 4. Otherwise null
 */
export async function getEffectiveUserId(
  supabaseUserId: string | null | undefined
): Promise<string | null> {
  if (supabaseUserId) return supabaseUserId;
  const mock = getMockUser();
  if (mock?.id) return mock.id;
  if (isDemoMode()) return DEMO_USER_ID;
  return null;
}
