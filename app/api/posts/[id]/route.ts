import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEffectiveUserId } from '@/lib/effectiveUser';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zdvedfnpipgygvikoooa.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1EEA1MtGEqz8vWJAApQM6Q_FnjK-aaw';

function getEffectiveUserIdFromReq(req: NextRequest, user: { id: string } | null): string | null {
  const uid = getEffectiveUserId(user?.id ?? null);
  if (uid) return uid;
  const demoHeader = req.headers.get('x-demo-mode') === 'true';
  const demoCookie = req.cookies.get('octane_demo_mode')?.value === 'true';
  return demoHeader || demoCookie ? 'demo_user_mvp_v1' : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveUserId = getEffectiveUserIdFromReq(req, user);
    if (!effectiveUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('content_posts')
      .select('*')
      .eq('id', id)
      .eq('user_id', effectiveUserId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('posts [id] GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveUserId = getEffectiveUserIdFromReq(req, user);
    if (!effectiveUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    const allowed = [
      'status', 'idea_title', 'script', 'hook', 'beats', 'cta', 'caption', 'hashtags',
      'final_video_url', 'background_video_url', 'style_token_id', 'source_url', 'scheduled_at',
    ];
    for (const k of allowed) {
      if (k in body) updates[k] = body[k];
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('content_posts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', effectiveUserId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('posts [id] PATCH error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
