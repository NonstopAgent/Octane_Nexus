import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

/**
 * POST: Mark clip job as done. Body: { jobId: string }
 * Ownership: job must belong to effective user.
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
    const jobId = typeof body?.jobId === 'string' ? body.jobId.trim() : '';
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await db
      .from('clip_jobs')
      .update({ status: 'done', updated_at: new Date().toISOString(), error: null })
      .eq('id', jobId)
      .eq('user_id', userId)
      .select('id, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Job not found or not owned' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status: data.status });
  } catch (e) {
    console.error('clip-jobs/complete error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
