/**
 * Effective user resolution for Octane Nexus.
 * - Real auth: use the Supabase user id.
 * - Demo mode + no session: fall back to DEMO_USER_ID, in local dev ONLY.
 */

import { DEMO_USER_ID } from './constants';

type DemoEnv = {
  NEXT_PUBLIC_DEMO_MODE?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

/**
 * Whether demo mode is switched on at all.
 *
 * This still governs the demo seeding UI, which is harmless — it only ever
 * acts for an already-authenticated user.
 */
export function isDemoMode(env: DemoEnv = process.env): boolean {
  if (typeof process === 'undefined') return false;
  return env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Whether demo mode may hand out an identity to a caller with no session.
 *
 * Deliberately narrower than isDemoMode(). `getEffectiveUserId` is used by 111
 * call sites across roughly forty API routes, so if this returned true in
 * production every one of them would treat an unauthenticated request as
 * DEMO_USER_ID — a blanket auth bypass for the entire API.
 *
 * That is not a hypothetical misuse. NEXT_PUBLIC_DEMO_MODE is the same flag
 * that enables the demo library seeding, which is what makes the product
 * evaluable without a YouTube channel. So the obvious move — "turn on demo
 * mode in Vercel so people can try it" — would silently open everything.
 * Seeding keeps working; only the identity fallback is refused.
 */
export function isDemoIdentityAllowed(env: DemoEnv = process.env): boolean {
  if (!isDemoMode(env)) return false;
  const isProduction = Boolean(env.VERCEL_ENV) || env.NODE_ENV === 'production';
  return !isProduction;
}

/**
 * Resolve the effective user id for a server-side API route.
 * Returns null when there is no session and no permitted demo fallback —
 * callers must treat null as unauthenticated.
 */
export function getEffectiveUserId(
  supabaseUserId: string | null,
  env: DemoEnv = process.env
): string | null {
  if (supabaseUserId) return supabaseUserId;
  if (isDemoIdentityAllowed(env)) return DEMO_USER_ID;
  return null;
}
