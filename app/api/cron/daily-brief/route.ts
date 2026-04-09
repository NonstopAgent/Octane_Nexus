import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { generateAndSaveBrief } from '@/lib/dailyBrief';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron: pre-generate daily briefs for users with YouTube imports or tracked channels.
 *
 * Security: set CRON_SECRET in Vercel project env. Vercel Cron sends
 *   Authorization: Bearer <CRON_SECRET>
 * when that variable is configured.
 */
function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth === `Bearer ${secret}`) return true;
  }
  if (req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: fromArtifacts } = await admin
    .from('creator_artifacts')
    .select('user_id')
    .eq('source', 'imported_youtube');

  const { data: fromTracked } = await admin.from('tracked_channels').select('user_id');

  const ids = new Set<string>();
  for (const r of fromArtifacts || []) {
    if (r.user_id) ids.add(r.user_id as string);
  }
  for (const r of fromTracked || []) {
    if (r.user_id) ids.add(r.user_id as string);
  }

  const userIds = [...ids].slice(0, 25);
  let generated = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const result = await generateAndSaveBrief(admin, userId, today);
    if (result) generated += 1;
    else skipped += 1;
  }

  return NextResponse.json({
    date: today,
    eligibleUsers: userIds.length,
    generated,
    skipped,
  });
}
