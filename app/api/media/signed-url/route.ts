import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { bucketForPath, isStoragePath } from '@/lib/media-resolver';

const EXPIRE_SEC = 3600;

/**
 * GET /api/media/signed-url?path=
 * Returns a short-lived signed URL for playback.
 * Ownership: path must be in clips (output_path), uploads (storage_path), or content_posts (final/background_video_url) for the effective user.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const path = req.nextUrl.searchParams.get('path')?.trim();
    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    if (!isStoragePath(path)) {
      return NextResponse.json({ error: 'path does not look like a storage path' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const [clipRes, uploadRes, postByFinal, postByBg] = await Promise.all([
      db.from('clips').select('id').eq('output_path', path).eq('user_id', userId).limit(1).maybeSingle(),
      db.from('uploads').select('id').eq('storage_path', path).eq('user_id', userId).limit(1).maybeSingle(),
      db.from('content_posts').select('id').eq('final_video_url', path).eq('user_id', userId).limit(1).maybeSingle(),
      db.from('content_posts').select('id').eq('background_video_url', path).eq('user_id', userId).limit(1).maybeSingle(),
    ]);

    const owned =
      (clipRes.data != null) ||
      (uploadRes.data != null) ||
      (postByFinal.data != null) ||
      (postByBg.data != null);

    if (!owned) {
      return NextResponse.json({ error: 'Not found or not owned' }, { status: 404 });
    }

    const bucket = bucketForPath(path);
    const client = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, EXPIRE_SEC);

    if (error) {
      console.error('media/signed-url error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const url = (data as { signedUrl?: string })?.signedUrl ?? (data as { url?: string })?.url;
    return NextResponse.json({ url: url ?? null });
  } catch (e) {
    console.error('media/signed-url error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
