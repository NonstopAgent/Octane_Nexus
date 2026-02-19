import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

const ALLOWED_KEYS = [
  'status',
  'caption',
  'hashtags',
  'scheduled_date',
  'platform',
  'script_content',
  'title',
  'background_video_url',
  'background_reason',
  'overlay_image_url',
  'final_video_url',
  'style_token_id',
  'updated_at',
] as const;

/**
 * PATCH: Update a content post. Enforces eq('user_id', effectiveUserId). 404 if not owned.
 * Service role for demo.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const key of ALLOWED_KEYS) {
      if (key === 'updated_at') continue;
      if (!(key in body)) continue;
      const value = body[key];
      if (key === 'status' && typeof value === 'string') {
        updatePayload[key] = value;
        continue;
      }
      if (key === 'hashtags' && Array.isArray(value)) {
        updatePayload[key] = value;
        continue;
      }
      if (key === 'script_content' && (value === null || (typeof value === 'object' && !Array.isArray(value)))) {
        updatePayload[key] = value;
        continue;
      }
      if ((key === 'caption' || key === 'platform' || key === 'title' || key === 'scheduled_date' ||
           key === 'background_video_url' || key === 'background_reason' || key === 'overlay_image_url' || key === 'final_video_url') &&
          (value === null || value === undefined || typeof value === 'string')) {
        updatePayload[key] = value === '' ? null : value;
      }
      if (key === 'style_token_id' && (value === null || value === undefined || typeof value === 'string')) {
        updatePayload[key] = value === '' ? null : value;
      }
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await db
      .from('content_posts')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, status, caption, hashtags, scheduled_date, platform, title, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found or not owned' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('post-lab/posts/[id] PATCH error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
