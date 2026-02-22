import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { POST_STATUS } from '@/lib/postStatus';

function normalizeScheduledDate(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('T')) return trimmed;
  return `${trimmed}T12:00:00.000Z`;
}

/**
 * POST: Create content_posts from clip (final_video_url = clip.output_path), status READY or SCHEDULED.
 * Body: { clipId: string, scheduledDate?: string }
 * Ownership: clip must belong to effective user.
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
    const clipId = typeof body?.clipId === 'string' ? body.clipId.trim() : '';
    const scheduledDateRaw = typeof body?.scheduledDate === 'string' ? body.scheduledDate.trim() : '';

    if (!clipId) {
      return NextResponse.json({ error: 'clipId is required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const { data: clip, error: clipErr } = await db
      .from('clips')
      .select('id, title, caption, hashtags, output_path')
      .eq('id', clipId)
      .eq('user_id', userId)
      .single();

    if (clipErr || !clip) {
      return NextResponse.json({ error: 'Clip not found or not owned' }, { status: 404 });
    }

    const title = (clip.title as string) || 'Clip';
    const hasDate = !!scheduledDateRaw;
    const scheduledDate = hasDate ? normalizeScheduledDate(scheduledDateRaw) : null;

    const { data: post, error: postErr } = await db
      .from('content_posts')
      .insert({
        user_id: userId,
        title,
        script_content: null,
        status: hasDate ? POST_STATUS.SCHEDULED : POST_STATUS.READY,
        caption: (clip.caption as string) || null,
        hashtags: Array.isArray(clip.hashtags) ? clip.hashtags : [],
        final_video_url: (clip.output_path as string) || null,
        ...(hasDate && scheduledDate ? { scheduled_date: scheduledDate } : {}),
      })
      .select('id, status, scheduled_date')
      .single();

    if (postErr) {
      console.error('send-to-schedule insert error:', postErr);
      return NextResponse.json({ error: postErr.message }, { status: 500 });
    }

    return NextResponse.json({ postId: post?.id, status: post?.status });
  } catch (e) {
    console.error('clips/send-to-schedule error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
