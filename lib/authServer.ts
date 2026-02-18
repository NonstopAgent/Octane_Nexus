/**
 * Server-side auth helper for API routes and server actions: resolve effective user id when
 * Supabase session is missing but demo mode or mock cookie is present.
 */

import type { NextRequest } from 'next/server';

const MOCK_USER_COOKIE = 'octane_mock_user';

/** User id used for demo mode when no real/mock session. */
export const DEMO_USER_ID = 'dev_admin';

function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === '1';
}

function parseMockUserId(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  try {
    const data = JSON.parse(cookieValue) as { id?: string };
    return data?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns effective user id for this request (API routes).
 * 1. Use supabaseUserId if provided (from supabase.auth.getUser()).
 * 2. If no user and request has octane_mock_user cookie, parse and return that id.
 * 3. If no user and demo mode, return DEMO_USER_ID so APIs work without login.
 * 4. Otherwise null.
 */
export function getEffectiveUserIdFromRequest(
  request: NextRequest,
  supabaseUserId: string | null | undefined
): string | null {
  if (supabaseUserId) return supabaseUserId;
  const id = parseMockUserId(request.cookies.get(MOCK_USER_COOKIE)?.value);
  if (id) return id;
  if (isDemoMode()) return DEMO_USER_ID;
  return null;
}

/**
 * Returns effective user id when you have a cookie store (e.g. from cookies() in server actions).
 */
export function getEffectiveUserIdFromCookieStore(
  cookieStore: { get: (name: string) => { value: string } | undefined },
  supabaseUserId: string | null | undefined
): string | null {
  if (supabaseUserId) return supabaseUserId;
  const id = parseMockUserId(cookieStore.get(MOCK_USER_COOKIE)?.value);
  if (id) return id;
  if (isDemoMode()) return DEMO_USER_ID;
  return null;
}
