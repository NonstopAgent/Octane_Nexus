/**
 * GET /api/cron/brief-worker
 *
 * Drains the brief_jobs queue. Claims a small batch atomically, generates each
 * brief, and stops before the Hobby 60s function limit — whatever is left stays
 * queued for the next invocation instead of being lost.
 *
 * Driven by GitHub Actions on a short schedule (see
 * .github/workflows/brief-worker.yml), because Vercel Hobby only allows one
 * cron run per day. Safe to call as often as you like: jobs are claimed with
 * FOR UPDATE SKIP LOCKED, so overlapping runs never process the same user.
 *
 * Security: same CRON_SECRET bearer token as the daily cron.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { checkCronAuth } from '@/lib/security';
import { runBriefForUser } from '@/lib/briefPipeline';
import {
  DEFAULT_BATCH_SIZE,
  briefDateFor,
  claimBriefJobs,
  finishBriefJob,
  hasTimeBudget,
  resolveJobStatus,
  summarizeQueue,
  type BriefJobStatus,
} from '@/lib/briefQueue';

export async function GET(req: NextRequest) {
  const cronAuth = checkCronAuth(req.headers);
  if (!cronAuth.ok) {
    return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.status });
  }

  const startedAt = Date.now();
  const admin = createServiceRoleClient();

  const url = new URL(req.url);
  const briefDate = url.searchParams.get('date') ?? briefDateFor();
  const batchSize = Number(url.searchParams.get('batch')) || DEFAULT_BATCH_SIZE;

  let generated = 0;
  let skipped = 0;
  let retried = 0;
  let failed = 0;
  const processed: Array<{ userId: string; status: BriefJobStatus }> = [];

  try {
    while (hasTimeBudget(Date.now() - startedAt)) {
      const jobs = await claimBriefJobs(admin, briefDate, batchSize);
      if (jobs.length === 0) break;

      for (const job of jobs) {
        let outcome: { status: BriefJobStatus; lastError: string | null };

        try {
          const result = await runBriefForUser(admin, job.user_id, briefDate);
          outcome = resolveJobStatus({
            generated: result.generated,
            attempts: job.attempts,
          });
          if (result.generated) generated += 1;
          else skipped += 1;
        } catch (err) {
          outcome = resolveJobStatus({
            generated: false,
            error: err,
            attempts: job.attempts,
          });
          if (outcome.status === 'failed') failed += 1;
          else retried += 1;
          console.error(`[brief-worker] job ${job.id} failed`, err);
        }

        await finishBriefJob(admin, job.id, outcome.status, outcome.lastError);
        processed.push({ userId: job.user_id, status: outcome.status });

        if (!hasTimeBudget(Date.now() - startedAt)) break;
      }
    }

    const queue = await summarizeQueue(admin, briefDate);

    return NextResponse.json({
      date: briefDate,
      processed: processed.length,
      generated,
      skipped,
      retried,
      failed,
      queue,
      elapsedMs: Date.now() - startedAt,
      message:
        queue.pending > 0
          ? `${queue.pending} job(s) still queued — the next worker pass will pick them up.`
          : 'Queue drained for this date.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[cron/brief-worker]', err);
    return NextResponse.json(
      { error: message, generated, processed: processed.length },
      { status: 500 }
    );
  }
}
