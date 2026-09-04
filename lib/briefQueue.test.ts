import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ESTIMATED_JOB_MS,
  MAX_ATTEMPTS,
  WORKER_BUDGET_MS,
  briefDateFor,
  hasTimeBudget,
  resolveJobStatus,
} from './briefQueue';

describe('hasTimeBudget', () => {
  it('allows a job at the start of a run', () => {
    assert.equal(hasTimeBudget(0), true);
  });

  it('stops before the Hobby 60s function limit', () => {
    // The whole point: never start work the platform will kill mid-flight.
    assert.ok(WORKER_BUDGET_MS < 60_000);
    assert.equal(hasTimeBudget(WORKER_BUDGET_MS), false);
  });

  it('reserves a full job of headroom rather than squeezing one in', () => {
    const almostFull = WORKER_BUDGET_MS - ESTIMATED_JOB_MS + 1;
    assert.equal(hasTimeBudget(almostFull), false);
    assert.equal(hasTimeBudget(WORKER_BUDGET_MS - ESTIMATED_JOB_MS), true);
  });

  it('honours explicit budgets', () => {
    assert.equal(hasTimeBudget(5_000, 20_000, 10_000), true);
    assert.equal(hasTimeBudget(15_000, 20_000, 10_000), false);
  });
});

describe('resolveJobStatus', () => {
  it('marks a generated brief done', () => {
    const r = resolveJobStatus({ generated: true, attempts: 1 });
    assert.deepEqual(r, { status: 'done', lastError: null });
  });

  it('marks a user with nothing to brief on done, not failed', () => {
    // No tracked channels and no imports is a settled outcome. Retrying it
    // every 15 minutes would burn quota forever.
    const r = resolveJobStatus({ generated: false, attempts: 1 });
    assert.deepEqual(r, { status: 'done', lastError: null });
  });

  it('requeues a failure that still has attempts left', () => {
    const r = resolveJobStatus({
      generated: false,
      error: new Error('gemini timeout'),
      attempts: 1,
    });
    assert.equal(r.status, 'pending');
    assert.equal(r.lastError, 'gemini timeout');
  });

  it('gives up once attempts are exhausted', () => {
    const r = resolveJobStatus({
      generated: false,
      error: new Error('gemini timeout'),
      attempts: MAX_ATTEMPTS,
    });
    assert.equal(r.status, 'failed');
  });

  it('respects a custom maxAttempts', () => {
    assert.equal(
      resolveJobStatus({ generated: false, error: 'boom', attempts: 1, maxAttempts: 1 })
        .status,
      'failed'
    );
    assert.equal(
      resolveJobStatus({ generated: false, error: 'boom', attempts: 1, maxAttempts: 5 })
        .status,
      'pending'
    );
  });

  it('stringifies non-Error throws', () => {
    const r = resolveJobStatus({ generated: false, error: 'plain string', attempts: 1 });
    assert.equal(r.lastError, 'plain string');
  });

  it('truncates very long errors so one job cannot bloat the row', () => {
    const r = resolveJobStatus({
      generated: false,
      error: new Error('x'.repeat(5_000)),
      attempts: 1,
    });
    assert.equal(r.lastError?.length, 500);
  });
});

describe('briefDateFor', () => {
  it('formats as YYYY-MM-DD to match daily_briefs.brief_date', () => {
    assert.equal(briefDateFor(new Date('2026-09-04T12:34:56Z')), '2026-09-04');
  });

  it('uses UTC, so a late-evening US run does not skip a day', () => {
    assert.equal(briefDateFor(new Date('2026-09-04T23:59:59Z')), '2026-09-04');
  });
});
