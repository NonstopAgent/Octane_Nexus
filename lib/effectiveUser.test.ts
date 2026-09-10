import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getEffectiveUserId,
  isDemoIdentityAllowed,
  isDemoMode,
} from './effectiveUser';
import { DEMO_USER_ID } from './constants';

const DEMO_ON = { NEXT_PUBLIC_DEMO_MODE: 'true' };

describe('getEffectiveUserId', () => {
  it('always prefers a real session, demo mode or not', () => {
    assert.equal(getEffectiveUserId('real-user', { ...DEMO_ON }), 'real-user');
    assert.equal(
      getEffectiveUserId('real-user', { ...DEMO_ON, NODE_ENV: 'production' }),
      'real-user'
    );
  });

  it('falls back to the demo user in local dev', () => {
    assert.equal(
      getEffectiveUserId(null, { ...DEMO_ON, NODE_ENV: 'development' }),
      DEMO_USER_ID
    );
  });

  it('returns null for an anonymous caller when demo mode is off', () => {
    assert.equal(getEffectiveUserId(null, { NODE_ENV: 'development' }), null);
  });

  it('NEVER hands out an identity in production, even with demo mode on', () => {
    // This is an auth bypass guard, not a preference. getEffectiveUserId has
    // 111 call sites across ~40 API routes; returning DEMO_USER_ID here would
    // let an unauthenticated request act as a real user everywhere at once.
    assert.equal(
      getEffectiveUserId(null, { ...DEMO_ON, NODE_ENV: 'production' }),
      null
    );
  });

  it('NEVER hands out an identity on Vercel, even with demo mode on', () => {
    assert.equal(
      getEffectiveUserId(null, { ...DEMO_ON, VERCEL_ENV: 'production' }),
      null
    );
    assert.equal(
      getEffectiveUserId(null, { ...DEMO_ON, VERCEL_ENV: 'preview' }),
      null
    );
  });
});

describe('isDemoIdentityAllowed', () => {
  it('is false whenever demo mode is off', () => {
    assert.equal(isDemoIdentityAllowed({ NODE_ENV: 'development' }), false);
  });

  it('is true only in local dev with demo mode on', () => {
    assert.equal(
      isDemoIdentityAllowed({ ...DEMO_ON, NODE_ENV: 'development' }),
      true
    );
  });

  it('is false anywhere on Vercel', () => {
    assert.equal(isDemoIdentityAllowed({ ...DEMO_ON, VERCEL_ENV: 'preview' }), false);
  });
});

describe('isDemoMode', () => {
  it('still reports the raw flag, so demo seeding keeps working', () => {
    // Seeding only ever acts for an already-authenticated user, so it is not
    // gated on environment — only the identity fallback is.
    assert.equal(isDemoMode({ ...DEMO_ON, NODE_ENV: 'production' }), true);
    assert.equal(isDemoMode({ NODE_ENV: 'production' }), false);
  });
});
