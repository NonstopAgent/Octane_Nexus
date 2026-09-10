/**
 * GET /api/cron/daily-brief
 *
 * Daily Vercel Cron. Enqueues one brief job per eligible user and returns.
 * It does no generation itself, so it finishes well inside the Hobby 60s limit
 * no matter how many users exist — the previous version looped over
 * `slice(0, 25)` and silently dropped everyone it couldn't reach in time.
 *
 * The jobs are drained by /api/cron/brief-worker.
 *
 * Security / history
 * ------------------
 * This route returned 401 on every scheduled run for weeks and nothing
 * alerted, because a 401 is a "successful" HTTP response as far as Vercel's
 * cron reporting is concerned. The daily brief — the entire product — simply
 * never generated.
 *
 * Two things prevent a repeat. Authorization is the CRON_SECRET bearer token,
 * the only mechanism Vercel documents, and it fails CLOSED with a 500 (not a
 * 401) in production when the secret is unset, so a misconfiguration surfaces
 * as a server error rather than a plausible-looking rejection. And every
 * rejection is logged with its reason, so a bad config is visible in the logs
 * within one run instead of invisible for a month.
 *
 * If you rotate CRON_SECRET in the Vercel dashboard you must redeploy — env
 * changes do not reach an already-running deployment.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { checkCronAuth } from '@/lib/security';
import {
  briefDateFor,
  collectEligibleUserIds,
  countRegisteredUsers,
  enqueueBriefJobs,
  summarizeQueue,
} from '@/lib/briefQueue';

export async function GET(req: NextRequest) {
  const cronAuth = checkCronAuth(req.headers);
  if (!cronAuth.ok) {
    // Loud on purpose. The previous silent 401 hid a total product outage.
    console.error(`[cron/daily-brief] REJECTED (${cronAuth.status}): ${cronAuth.error}`);
    return NextResponse.json(
      { error: 'Unauthorized', reason: cronAuth.error },
      { status: cronAuth.status }
    );
  }
  if (cronAuth.weak) {
    console.warn(
      '[cron/daily-brief] authorized on Vercel cron User-Agent alone because CRON_SECRET is unset. ' +
        'That header is spoofable — set CRON_SECRET in Vercel and redeploy.'
    );
  }

  const admin = createServiceRoleClient();
  const briefDate = briefDateFor();

  try {
    const [userIds, registeredUsers] = await Promise.all([
      collectEligibleUserIds(admin),
      countRegisteredUsers(admin),
    ]);
    const { enqueued } = await enqueueBriefJobs(admin, userIds, briefDate);
    const queue = await summarizeQueue(admin, briefDate);

    const ineligibleUsers = Math.max(0, registeredUsers - userIds.length);

    const summary = {
      date: briefDate,
      registeredUsers,
      eligibleUsers: userIds.length,
      ineligibleUsers,
      enqueued,
      queue,
      message:
        'Jobs queued. /api/cron/brief-worker generates the briefs a batch at a time.',
    };

    // A run that "succeeds" having queued nothing must look different in the
    // logs from one that actually worked.
    if (userIds.length === 0) {
      console.warn(
        '[cron/daily-brief] no eligible users — nobody has imported YouTube videos or tracked a channel',
        summary
      );
    } else {
      console.info(
        `[cron/daily-brief] ${enqueued} job(s) queued for ${userIds.length} eligible user(s)`,
        summary
      );
    }

    // The silent majority. Someone who signed up and never connected a channel
    // is skipped by this job every day with no error, so a recruited tester who
    // bounced looks identical to no tester at all. Make the ratio visible.
    if (ineligibleUsers > 0) {
      console.warn(
        `[cron/daily-brief] ${ineligibleUsers} of ${registeredUsers} registered user(s) are NOT eligible ` +
          'for a brief — they have no tracked channel and no imported videos, so they will receive nothing.'
      );
    }

    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[cron/daily-brief] failed to enqueue', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
