import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Brief generation queue.
 *
 * The daily cron used to loop over `userIds.slice(0, 25)` inside a single 60s
 * function. Anyone past 25 was silently dropped, and in practice the timeout
 * bit long before the cap did. Now the cron only enqueues; a worker route
 * drains the queue a few jobs at a time and retries what fails.
 *
 * The pure functions here carry the scheduling decisions so they can be tested
 * without a database.
 */

/** Vercel Hobby caps a function at 60s; stop well before that. */
export const WORKER_BUDGET_MS = 50_000;

/** Rough cost of one brief: channel refresh + feedback loop + one LLM call. */
export const ESTIMATED_JOB_MS = 14_000;

export const DEFAULT_BATCH_SIZE = 3;
export const MAX_ATTEMPTS = 3;

export type BriefJobStatus = 'pending' | 'running' | 'done' | 'failed';

export type BriefJob = {
  id: string;
  user_id: string;
  brief_date: string;
  status: BriefJobStatus;
  attempts: number;
};

/**
 * Whether there is room for another job before the function is killed.
 * Reserves one job's worth of headroom so we never start work we can't finish.
 */
export function hasTimeBudget(
  elapsedMs: number,
  budgetMs: number = WORKER_BUDGET_MS,
  perJobMs: number = ESTIMATED_JOB_MS
): boolean {
  return elapsedMs + perJobMs <= budgetMs;
}

/**
 * Where a job lands after an attempt.
 *
 * `generated: false` with no error means the user had nothing to build a brief
 * from (no tracked channels, no imports). That is a settled outcome, not a
 * failure — retrying it every hour would just burn quota.
 */
export function resolveJobStatus(input: {
  generated: boolean;
  error?: unknown;
  attempts: number;
  maxAttempts?: number;
}): { status: BriefJobStatus; lastError: string | null } {
  const maxAttempts = input.maxAttempts ?? MAX_ATTEMPTS;

  if (!input.error) {
    return { status: 'done', lastError: null };
  }

  const message =
    input.error instanceof Error ? input.error.message : String(input.error);

  return {
    status: input.attempts >= maxAttempts ? 'failed' : 'pending',
    lastError: message.slice(0, 500),
  };
}

/** Today in UTC as YYYY-MM-DD, matching daily_briefs.brief_date. */
export function briefDateFor(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Every user who should get a brief: anyone with imported YouTube videos or a
 * tracked channel. No cap — the queue absorbs the volume.
 */
export async function collectEligibleUserIds(
  admin: SupabaseClient
): Promise<string[]> {
  const [{ data: fromArtifacts }, { data: fromTracked }] = await Promise.all([
    admin
      .from('creator_artifacts')
      .select('user_id')
      .eq('source', 'imported_youtube'),
    admin.from('tracked_channels').select('user_id'),
  ]);

  const ids = new Set<string>();
  for (const row of fromArtifacts ?? []) {
    if (row.user_id) ids.add(row.user_id as string);
  }
  for (const row of fromTracked ?? []) {
    if (row.user_id) ids.add(row.user_id as string);
  }
  return [...ids];
}

/**
 * Queue one job per user for the date. Idempotent: the table is unique on
 * (user_id, brief_date), so re-running the cron never duplicates work and
 * never resets a job that already finished.
 */
export async function enqueueBriefJobs(
  admin: SupabaseClient,
  userIds: string[],
  briefDate: string
): Promise<{ enqueued: number }> {
  if (userIds.length === 0) return { enqueued: 0 };

  const rows = userIds.map((user_id) => ({
    user_id,
    brief_date: briefDate,
    status: 'pending' as const,
  }));

  const { data, error } = await admin
    .from('brief_jobs')
    .upsert(rows, { onConflict: 'user_id,brief_date', ignoreDuplicates: true })
    .select('id');

  if (error) throw new Error(`enqueueBriefJobs: ${error.message}`);
  return { enqueued: data?.length ?? 0 };
}

/** Atomically claim a batch (FOR UPDATE SKIP LOCKED inside the function). */
export async function claimBriefJobs(
  admin: SupabaseClient,
  briefDate: string,
  limit: number = DEFAULT_BATCH_SIZE
): Promise<BriefJob[]> {
  const { data, error } = await admin.rpc('claim_brief_jobs', {
    p_brief_date: briefDate,
    p_limit: limit,
    p_max_attempts: MAX_ATTEMPTS,
  });

  if (error) throw new Error(`claimBriefJobs: ${error.message}`);
  return (data ?? []) as BriefJob[];
}

export async function finishBriefJob(
  admin: SupabaseClient,
  jobId: string,
  status: BriefJobStatus,
  lastError: string | null
): Promise<void> {
  await admin
    .from('brief_jobs')
    .update({
      status,
      last_error: lastError,
      locked_at: null,
      completed_at: status === 'done' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

/** Counts for the cron/worker response, so a bad day is visible in the logs. */
export async function summarizeQueue(
  admin: SupabaseClient,
  briefDate: string
): Promise<Record<BriefJobStatus, number>> {
  const { data } = await admin
    .from('brief_jobs')
    .select('status')
    .eq('brief_date', briefDate);

  const summary: Record<BriefJobStatus, number> = {
    pending: 0,
    running: 0,
    done: 0,
    failed: 0,
  };
  for (const row of data ?? []) {
    const status = row.status as BriefJobStatus;
    if (status in summary) summary[status] += 1;
  }
  return summary;
}
