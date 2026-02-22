import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

const BUCKET = 'clip-uploads';

/**
 * POST: Get signed upload URL + storage path for direct client upload.
 * Body: { filename: string }. Returns { path, token } for uploadToSignedUrl.
 * Effective user aware; service role for demo (bucket may be RLS-restricted).
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
    const filename = typeof body?.filename === 'string' ? body.filename.trim() : '';
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'mp4';
    const safeExt = ['mp4', 'mov', 'm4v'].includes(ext) ? ext : 'mp4';
    const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;

    const client = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);

    if (error) {
      console.error('uploads/init createSignedUploadUrl error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      path,
      token: (data as { token?: string })?.token ?? (data as { signedUrl?: string; token?: string })?.token,
    });
  } catch (e) {
    console.error('uploads/init error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
