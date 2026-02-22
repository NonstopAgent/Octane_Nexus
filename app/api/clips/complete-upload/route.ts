import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

/**
 * POST: Set output_path (storage path only) and optional metadata after client upload.
 * Body: { clipId: string, output_path: string (storage path, e.g. clips/{userId}/{jobId}/{clipId}.mp4), title?, caption?, hashtags? }
 * Ownership: clip must belong to effective user; path must match expected prefix for user.
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
    const outputPath = typeof body?.output_path === 'string' ? body.output_path.trim() : '';

    if (!clipId || !outputPath) {
      return NextResponse.json({ error: 'clipId and output_path are required' }, { status: 400 });
    }

    const expectedPrefix = `clips/${userId}/`;
    if (!outputPath.startsWith(expectedPrefix) || !outputPath.endsWith('.mp4')) {
      return NextResponse.json({ error: 'Invalid output_path' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const updatePayload: Record<string, unknown> = {
      output_path: outputPath,
    };
    if (typeof body?.title === 'string') updatePayload.title = body.title;
    if (typeof body?.caption === 'string') updatePayload.caption = body.caption;
    if (Array.isArray(body?.hashtags)) updatePayload.hashtags = body.hashtags;

    const { data, error } = await db
      .from('clips')
      .update(updatePayload)
      .eq('id', clipId)
      .eq('user_id', userId)
      .select('id, output_path, title, caption, hashtags, start_seconds, end_seconds, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Clip not found or not owned' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('clips/complete-upload error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
