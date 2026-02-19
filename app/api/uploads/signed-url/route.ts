import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

const BUCKET = 'clip-uploads';
const EXPIRE_SEC = 3600;

/**
 * GET: Signed download URL for an upload. Query: path= (storage_path).
 * Ownership: upload must belong to effective user.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const path = req.nextUrl.searchParams.get('path');
    if (!path || typeof path !== 'string' || !path.trim()) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data: upload } = await db
      .from('uploads')
      .select('id')
      .eq('storage_path', path.trim())
      .eq('user_id', userId)
      .single();

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found or not owned' }, { status: 404 });
    }

    const client = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUrl(path.trim(), EXPIRE_SEC);

    if (error) {
      console.error('uploads/signed-url error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ url: (data as { signedUrl?: string })?.signedUrl ?? (data as { url?: string })?.url });
  } catch (e) {
    console.error('uploads/signed-url error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
