import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

const CLIP_OUTPUTS_BUCKET = 'clip-outputs';
const EXPIRE_SEC = 3600;

/**
 * GET: Short-lived signed URL for clip preview (inline playback).
 * Query: clipId=
 * Ownership: clip must belong to effective user; output_path must be set (not pending).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clipId = req.nextUrl.searchParams.get('clipId');
    if (!clipId?.trim()) {
      return NextResponse.json({ error: 'clipId is required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data: clip, error: clipErr } = await db
      .from('clips')
      .select('output_path')
      .eq('id', clipId.trim())
      .eq('user_id', userId)
      .single();

    if (clipErr || !clip) {
      return NextResponse.json({ error: 'Clip not found or not owned' }, { status: 404 });
    }

    const path = clip.output_path as string | null;
    if (!path || path === 'pending') {
      return NextResponse.json({ error: 'Clip not ready' }, { status: 404 });
    }

    const client = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await client.storage
      .from(CLIP_OUTPUTS_BUCKET)
      .createSignedUrl(path, EXPIRE_SEC);

    if (error) {
      console.error('clips/signed-url error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const url = (data as { signedUrl?: string })?.signedUrl ?? (data as { url?: string })?.url;
    return NextResponse.json({ url: url ?? null });
  } catch (e) {
    console.error('clips/signed-url error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
