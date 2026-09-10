import { timingSafeEqual } from 'crypto';

/**
 * Security primitives shared by API routes.
 *
 * Everything here is a pure function over its inputs so it can be unit tested
 * without a server, a database or a network call.
 */

export type CronAuthResult =
  | { ok: true; weak?: boolean }
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
 * The CRON_SECRET bearer token is the only mechanism Vercel documents, so once
 * it is configured it is the ONLY thing accepted — no header or User-Agent can
 * substitute for it. That matters: otherwise setting the secret would
 * paradoxically leave the endpoint no better protected than before.
 *
 * While the secret is unset there is one stopgap. Vercel's cron User-Agent is
 * accepted, loudly flagged as weak by the caller. This is deliberate and hard
 * won: this route previously failed closed with a 401 on every scheduled run
 * for weeks, and because Vercel counts a 401 as a successful HTTP response,
 * nothing alerted and the entire product silently stopped generating. Failing
 * closed on a missing env var reproduces exactly that outage. The User-Agent
 * is trivially spoofable, so the worst case is someone else spending quota —
 * bounded by the brief idempotency guard and the 6-hour channel-sync skip, and
 * closed completely the moment CRON_SECRET is set.
 *
 * With no secret and no Vercel signal at all, we fail with a 500 rather than a
 * 401, because a server error is visible in monitoring where a plausible
 * rejection is not.
 */
export function checkCronAuth(
  headers: { get(name: string): string | null },
  env: SecurityEnv = process.env
): CronAuthResult {
  const secret = env.CRON_SECRET?.trim();
  const auth = headers.get('authorization') ?? '';

  if (secret) {
    if (safeEqual(auth, `Bearer ${secret}`)) {
      return { ok: true };
    }
    return {
      ok: false,
      status: 401,
      error: `CRON_SECRET is set but the Authorization header did not match (header ${
        auth ? 'present but different' : 'absent'
      }). If you rotated CRON_SECRET in the Vercel dashboard, redeploy — env changes do not reach a running deployment.`,
    };
  }

  // No secret configured. Keep the product running on Vercel's own cron
  // User-Agent, but make the weakness impossible to miss in the logs.
  if (/vercel-cron/i.test(headers.get('user-agent') ?? '')) {
    return { ok: true, weak: true };
  }

  if (isProductionRuntime(env)) {
    return {
      ok: false,
      status: 500,
      error:
        'CRON_SECRET is not configured and no Vercel cron signal was present. Set CRON_SECRET in the deployment environment and redeploy.',
    };
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
