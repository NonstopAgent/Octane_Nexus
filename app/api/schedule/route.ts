import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { POST_STATUS } from '@/lib/postStatus';
import { resolvePostVideoFields } from '@/lib/media-resolver';

/**
 * Inclusive month range: startOfDay(start) <= x < startOfDay(end + 1 day) to avoid timezone/time-of-day misses.
 */
function startOfDayUtc(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

function dayAfterUtc(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10) + 'T00:00:00.000Z';
}

/**
 * GET: List scheduled content_posts in range and drafts (READY) for effective user.
 * Query: start=YYYY-MM-DD&end=YYYY-MM-DD (inclusive).
 * Returns { scheduled: ContentPost[], drafts: ContentPost[] }.
 * Ownership: every select uses eq('user_id', effectiveUserId).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') ?? '';
    const end = searchParams.get('end') ?? '';

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    let scheduled: unknown[] = [];
    if (start && end) {
      const rangeStart = startOfDayUtc(start);
      const rangeEndExclusive = dayAfterUtc(end);
      const scheduledRes = await db
        .from('content_posts')
        .select('id, title, final_video_url, background_video_url, caption, hashtags, platform, scheduled_date, status, created_at')
        .eq('user_id', userId)
        .eq('status', POST_STATUS.SCHEDULED)
        .gte('scheduled_date', rangeStart)
        .lt('scheduled_date', rangeEndExclusive)
        .order('scheduled_date', { ascending: true, nullsFirst: false });
      if (scheduledRes.error) {
        return NextResponse.json({ error: scheduledRes.error.message }, { status: 500 });
      }
      const service = createServiceRoleClient();
      scheduled = await Promise.all(
        (scheduledRes.data ?? []).map(async (p: Record<string, unknown>) => {
          const resolved = await resolvePostVideoFields(
            (p.final_video_url as string) ?? null,
            (p.background_video_url as string) ?? null,
            service
          );
          return { ...p, ...resolved };
        })
      );
    }

    const draftsRes = await db
      .from('content_posts')
      .select('id, title, final_video_url, background_video_url, caption, hashtags, platform, scheduled_date, status, created_at')
      .eq('user_id', userId)
      .eq('status', POST_STATUS.READY)
      .order('updated_at', { ascending: false });

    if (draftsRes.error) {
      return NextResponse.json({ error: draftsRes.error.message }, { status: 500 });
    }

    const serviceForDrafts = createServiceRoleClient();
    const drafts = await Promise.all(
      (draftsRes.data ?? []).map(async (p: Record<string, unknown>) => {
        const resolved = await resolvePostVideoFields(
          (p.final_video_url as string) ?? null,
          (p.background_video_url as string) ?? null,
          serviceForDrafts
        );
        return { ...p, ...resolved };
      })
    );

    return NextResponse.json({
      scheduled,
      drafts,
    });
  } catch (e) {
    console.error('schedule GET error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * Normalize scheduled_date: accept YYYY-MM-DD or full ISO. If date-only, use noon UTC so day is unambiguous.
 * TODO: If content_posts gains a scheduled_day (DATE) column, persist it for date-only inputs; month query logic still works via scheduled_date.
 */
function normalizeScheduledDate(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('T')) return trimmed;
  return `${trimmed}T12:00:00.000Z`;
}

/**
 * POST: Set scheduled_date and status=scheduled for a content_post.
 * Body: { postId: string, scheduled_date: string } (ISO or YYYY-MM-DD).
 * Ownership: update only where id = postId AND user_id = effectiveUserId; 404 if not owned.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const postId = typeof body?.postId === 'string' ? body.postId.trim() : '';
    const scheduledDateRaw = typeof body?.scheduled_date === 'string' ? body.scheduled_date : '';

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }
    if (!scheduledDateRaw) {
      return NextResponse.json({ error: 'scheduled_date is required' }, { status: 400 });
    }

    const scheduledDate = normalizeScheduledDate(scheduledDateRaw);

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const { data, error } = await db
      .from('content_posts')
      .update({
        scheduled_date: scheduledDate,
        status: POST_STATUS.SCHEDULED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId)
      .select('id, scheduled_date, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found or not owned' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('schedule POST error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
