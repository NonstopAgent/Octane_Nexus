import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

const CLIP_OUTPUTS_BUCKET = 'clip-outputs';
const EXPIRE_SEC = 3600;

/**
 * GET: Short-lived signed URL with download intent for the clip file.
 * Query: clipId=, filename= (optional, for Content-Disposition)
 * Ownership: clip must belong to effective user.
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
      .select('output_path, title')
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

    const filename = req.nextUrl.searchParams.get('filename')?.trim()
      || (clip.title as string)?.replace(/[^a-zA-Z0-9-_\.]/g, '_') + '.mp4'
      || `clip-${clipId}.mp4`;

    const client = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await client.storage
      .from(CLIP_OUTPUTS_BUCKET)
      .createSignedUrl(path, EXPIRE_SEC, { download: filename });

    if (error) {
      console.error('clips/signed-download error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const url = (data as { signedUrl?: string })?.signedUrl ?? (data as { url?: string })?.url;
    return NextResponse.json({ url: url ?? null });
  } catch (e) {
    console.error('clips/signed-download error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
