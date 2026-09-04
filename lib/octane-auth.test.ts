import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateOctaneSignature,
  verifyOctaneRequest,
  type OctanePayload,
} from './octane-auth';

const SECRET = 'test-shared-secret';

function payload(overrides: Partial<OctanePayload> = {}): OctanePayload {
  return {
    command: 'sync_state',
    project: 'nexus',
    timestamp: Date.now(),
    params: {},
    ...overrides,
  };
}

describe('verifyOctaneRequest', () => {
  it('accepts a correctly signed, fresh payload', () => {
    const p = payload();
    assert.equal(verifyOctaneRequest(p, generateOctaneSignature(p, SECRET), SECRET), true);
  });

  it('rejects a payload signed with a different secret', () => {
    const p = payload();
    assert.equal(
      verifyOctaneRequest(p, generateOctaneSignature(p, 'other-secret'), SECRET),
      false
    );
  });

  it('rejects a tampered payload', () => {
    const p = payload();
    const signature = generateOctaneSignature(p, SECRET);
    const tampered = { ...p, command: 'trigger_pipeline' };
    assert.equal(verifyOctaneRequest(tampered, signature, SECRET), false);
  });

  it('rejects a replayed payload older than five minutes', () => {
    const p = payload({ timestamp: Date.now() - 6 * 60 * 1000 });
    assert.equal(verifyOctaneRequest(p, generateOctaneSignature(p, SECRET), SECRET), false);
  });

  it('rejects a payload timestamped too far in the future', () => {
    const p = payload({ timestamp: Date.now() + 6 * 60 * 1000 });
    assert.equal(verifyOctaneRequest(p, generateOctaneSignature(p, SECRET), SECRET), false);
  });

  it('accepts a payload just inside the replay window', () => {
    const p = payload({ timestamp: Date.now() - 60 * 1000 });
    assert.equal(verifyOctaneRequest(p, generateOctaneSignature(p, SECRET), SECRET), true);
  });

  it('rejects a signature of the wrong length without throwing', () => {
    const p = payload();
    assert.equal(verifyOctaneRequest(p, 'abcd', SECRET), false);
  });

  it('rejects an empty signature without throwing', () => {
    const p = payload();
    assert.equal(verifyOctaneRequest(p, '', SECRET), false);
  });
});
