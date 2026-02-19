import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { resolvePostVideoFields } from '@/lib/media-resolver';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await db
      .from('content_posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const service = createServiceRoleClient();
    const resolved = await resolvePostVideoFields(
      (data.final_video_url as string) ?? null,
      (data.background_video_url as string) ?? null,
      service
    );
    return NextResponse.json({ ...data, ...resolved });
  } catch (err) {
    console.error('posts [id] GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

const ALLOWED_FIELDS = [
  'status', 'title', 'script_content', 'caption', 'hashtags',
  'final_video_url', 'background_video_url', 'style_token_id',
  'source_url', 'rights_attested', 'scheduled_date', 'platform',
  'posted_url', 'posted_at', 'trim_start_ms', 'trim_end_ms',
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    for (const k of ALLOWED_FIELDS) {
      if (k in body) updates[k] = body[k];
    }
    if ('scheduled_at' in body && !('scheduled_date' in body)) {
      updates.scheduled_date = body.scheduled_at;
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('content_posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('posts [id] PATCH error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
