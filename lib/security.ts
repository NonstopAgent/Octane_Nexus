import { timingSafeEqual } from 'crypto';

/**
 * Security primitives shared by API routes.
 *
 * Everything here is a pure function over its inputs so it can be unit tested
 * without a server, a database or a network call.
 */

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; error: string };

/** Only the variables these helpers read — keeps them trivially testable. */
export type SecurityEnv = {
  CRON_SECRET?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

/** True when running on Vercel or with NODE_ENV=production. */
export function isProductionRuntime(
  env: SecurityEnv = process.env
): boolean {
  return Boolean(env.VERCEL_ENV) || env.NODE_ENV === 'production';
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Authorize a Vercel Cron invocation.
 *
 * Vercel's documented mechanism is the CRON_SECRET bearer token and nothing
 * else. The `x-vercel-cron` header is NOT an authentication signal — any
 * caller can set it — so it is deliberately not honoured here.
 *
 * When CRON_SECRET is absent we fail closed in production rather than leaving
 * a service-role route open to the internet.
 */
export function checkCronAuth(
  headers: { get(name: string): string | null },
  env: SecurityEnv = process.env
): CronAuthResult {
  const secret = env.CRON_SECRET?.trim();

  if (!secret) {
    if (isProductionRuntime(env)) {
      return {
        ok: false,
        status: 500,
        error:
          'CRON_SECRET is not configured. Set it in the deployment environment before cron routes will run.',
      };
    }
    return { ok: true };
  }

  const auth = headers.get('authorization') ?? '';
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}

/**
 * Whether `candidate` may be fetched by our server-side image proxy.
 *
 * A prefix check is not enough: `https://proj.supabase.co` is a prefix of
 * `https://proj.supabase.co.attacker.com`, which would turn the proxy into an
 * SSRF primitive. Compare parsed origins instead, and require HTTPS.
 */
export function isAllowedProxyUrl(
  candidate: string | null | undefined,
  allowedBase: string | null | undefined
): boolean {
  if (!candidate || !allowedBase) return false;

  let target: URL;
  let allowed: URL;
  try {
    target = new URL(candidate);
    allowed = new URL(allowedBase);
  } catch {
    return false;
  }

  if (target.protocol !== 'https:') return false;
  return target.origin === allowed.origin;
}
