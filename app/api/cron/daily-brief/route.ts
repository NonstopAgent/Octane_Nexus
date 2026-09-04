/**
 * GET /api/cron/daily-brief
 *
 * Daily Vercel Cron. Enqueues one brief job per eligible user and returns.
 * It does no generation itself, so it finishes in well under the Hobby 60s
 * limit no matter how many users exist — the previous version looped over
 * `slice(0, 25)` and silently dropped everyone it couldn't reach in time.
 *
 * The jobs are drained by /api/cron/brief-worker.
 *
 * Security: CRON_SECRET as an `Authorization: Bearer` header, which is the
 * only mechanism Vercel documents. Fails closed in production when unset.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { checkCronAuth } from '@/lib/security';
import {
  briefDateFor,
  collectEligibleUserIds,
  enqueueBriefJobs,
  summarizeQueue,
} from '@/lib/briefQueue';

export async function GET(req: NextRequest) {
  const cronAuth = checkCronAuth(req.headers);
  if (!cronAuth.ok) {
    return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.status });
  }

  const admin = createServiceRoleClient();
  const briefDate = briefDateFor();

  try {
    const userIds = await collectEligibleUserIds(admin);
    const { enqueued } = await enqueueBriefJobs(admin, userIds, briefDate);
    const queue = await summarizeQueue(admin, briefDate);

    return NextResponse.json({
      date: briefDate,
      eligibleUsers: userIds.length,
      enqueued,
      queue,
      message:
        'Jobs queued. /api/cron/brief-worker generates the briefs a batch at a time.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[cron/daily-brief]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
