/**
 * Effective user resolution for Octane Nexus MVP.
 * - Real auth: use Supabase user id
 * - Demo mode (NEXT_PUBLIC_DEMO_MODE=true) + no session: use DEMO_USER_ID
 */

import { DEMO_USER_ID } from './constants';

export function isDemoMode(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Resolve effective user ID for server-side API routes.
 * Pass the Supabase user id from getSession; if null and demo mode, return DEMO_USER_ID.
 */
export function getEffectiveUserId(supabaseUserId: string | null): string | null {
  if (supabaseUserId) return supabaseUserId;
  if (isDemoMode()) return DEMO_USER_ID;
  return null;
}
