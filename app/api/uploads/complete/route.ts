import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

/**
 * POST: Create uploads row after client has uploaded to Storage.
 * Body: { path: string, filename: string, durationSeconds?: number }
 * Ownership: user_id = effectiveUserId.
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
    const path = typeof body?.path === 'string' ? body.path.trim() : '';
    const filename = typeof body?.filename === 'string' ? body.filename.trim() : '';
    const durationSeconds =
      typeof body?.durationSeconds === 'number' && Number.isFinite(body.durationSeconds)
        ? body.durationSeconds
        : null;

    if (!path || !filename) {
      return NextResponse.json({ error: 'path and filename are required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await db
      .from('uploads')
      .insert({
        user_id: userId,
        filename,
        storage_path: path,
        duration_seconds: durationSeconds,
      })
      .select('id, filename, storage_path, duration_seconds, created_at')
      .single();

    if (error) {
      console.error('uploads/complete insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('uploads/complete error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
