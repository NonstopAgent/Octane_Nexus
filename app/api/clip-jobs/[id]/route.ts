import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { createSignedPlaybackUrl } from '@/lib/media-resolver';

/**
 * GET: Fetch clip job and its clips (ownership enforced).
 * Clips include output_path + output_url (signed) when output_path is set.
 */
export async function GET(
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

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const { data: job, error: jobErr } = await db
      .from('clip_jobs')
      .select('id, upload_id, source_url, status, target_platform, created_at, updated_at, error')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Not found or not owned' }, { status: 404 });
    }

    const { data: clipsRows } = await db
      .from('clips')
      .select('id, start_seconds, end_seconds, title, caption, hashtags, output_path, created_at')
      .eq('clip_job_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    const service = createServiceRoleClient();
    const clips = await Promise.all((clipsRows ?? []).map(async (c: Record<string, unknown>) => {
      const path = c.output_path as string | null | undefined;
      const hasPath = path && path !== 'pending' && typeof path === 'string';
      const output_url = hasPath ? await createSignedPlaybackUrl(path, service) : null;
      return { ...c, output_url: output_url ?? undefined };
    }));

    return NextResponse.json({ job, clips });
  } catch (e) {
    console.error('clip-jobs/[id] GET error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
