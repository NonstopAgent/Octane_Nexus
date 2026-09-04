import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkCronAuth, isAllowedProxyUrl, isProductionRuntime } from './security';

function headers(map: Record<string, string> = {}) {
  return {
    get(name: string): string | null {
      return map[name.toLowerCase()] ?? null;
    },
  };
}

describe('checkCronAuth', () => {
  it('accepts a matching bearer token', () => {
    const result = checkCronAuth(headers({ authorization: 'Bearer s3cret' }), {
      CRON_SECRET: 's3cret',
      NODE_ENV: 'production',
    });
    assert.deepEqual(result, { ok: true });
  });

  it('rejects a wrong token with 401', () => {
    const result = checkCronAuth(headers({ authorization: 'Bearer nope' }), {
      CRON_SECRET: 's3cret',
      NODE_ENV: 'production',
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 401);
  });

  it('rejects a missing header when a secret is configured', () => {
    const result = checkCronAuth(headers(), {
      CRON_SECRET: 's3cret',
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 401);
  });

  it('does NOT accept a forged x-vercel-cron header', () => {
    // Regression guard: this header used to be an unconditional bypass.
    const result = checkCronAuth(headers({ 'x-vercel-cron': '1' }), {
      CRON_SECRET: 's3cret',
      NODE_ENV: 'production',
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 401);
  });

  it('fails CLOSED in production when CRON_SECRET is unset', () => {
    const result = checkCronAuth(headers(), {
      NODE_ENV: 'production',
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 500);
  });

  it('fails CLOSED on Vercel when CRON_SECRET is unset', () => {
    const result = checkCronAuth(headers(), {
      VERCEL_ENV: 'preview',
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 500);
  });

  it('treats a whitespace-only secret as unset', () => {
    const result = checkCronAuth(headers({ authorization: 'Bearer    ' }), {
      CRON_SECRET: '   ',
      NODE_ENV: 'production',
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 500);
  });

  it('allows local development when CRON_SECRET is unset', () => {
    const result = checkCronAuth(headers(), {
      NODE_ENV: 'development',
    });
    assert.deepEqual(result, { ok: true });
  });
});

describe('isProductionRuntime', () => {
  it('is true on Vercel', () => {
    assert.equal(isProductionRuntime({ VERCEL_ENV: 'production' }), true);
  });
  it('is true with NODE_ENV=production', () => {
    assert.equal(isProductionRuntime({ NODE_ENV: 'production' }), true);
  });
  it('is false in development', () => {
    assert.equal(isProductionRuntime({ NODE_ENV: 'development' }), false);
  });
});

describe('isAllowedProxyUrl', () => {
  const base = 'https://abcdef.supabase.co';

  it('allows a URL on the same origin', () => {
    assert.equal(
      isAllowedProxyUrl(`${base}/storage/v1/object/public/assets/logo.png`, base),
      true
    );
  });

  it('BLOCKS a look-alike host that merely shares the prefix', () => {
    // The original check was `url.startsWith(supabaseUrl)`, which this passes.
    assert.equal(
      isAllowedProxyUrl('https://abcdef.supabase.co.attacker.com/steal', base),
      false
    );
  });

  it('blocks an unrelated host', () => {
    assert.equal(isAllowedProxyUrl('https://evil.example.com/x.png', base), false);
  });

  it('blocks a non-HTTPS URL on the right host', () => {
    assert.equal(isAllowedProxyUrl('http://abcdef.supabase.co/x.png', base), false);
  });

  it('blocks a different subdomain', () => {
    assert.equal(isAllowedProxyUrl('https://other.supabase.co/x.png', base), false);
  });

  it('blocks unparseable input', () => {
    assert.equal(isAllowedProxyUrl('not-a-url', base), false);
  });

  it('blocks when either side is missing', () => {
    assert.equal(isAllowedProxyUrl(null, base), false);
    assert.equal(isAllowedProxyUrl(`${base}/x.png`, undefined), false);
  });
});
