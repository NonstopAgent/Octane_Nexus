import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

const BUCKET = 'clip-uploads';

/**
 * POST: Upload file via multipart/form-data (field "file"). Creates uploads row.
 * Use when client cannot use signed URL upload. Effective user + service role for demo.
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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const name = (file as File).name || 'video.mp4';
    const ext = name.split('.').pop()?.toLowerCase() || 'mp4';
    const safeExt = ['mp4', 'mov', 'm4v'].includes(ext) ? ext : 'mp4';
    const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const client = user?.id === userId ? supabase : createServiceRoleClient();
    const { error: uploadErr } = await client.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || 'video/mp4',
      upsert: false,
    });

    if (uploadErr) {
      console.error('uploads/upload storage error:', uploadErr);
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await db
      .from('uploads')
      .insert({
        user_id: userId,
        filename: name,
        storage_path: path,
        duration_seconds: null,
      })
      .select('id, filename, storage_path, duration_seconds, created_at')
      .single();

    if (error) {
      console.error('uploads/upload insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('uploads/upload error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
