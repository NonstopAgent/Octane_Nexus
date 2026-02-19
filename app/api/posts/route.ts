import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEffectiveUserId } from '@/lib/effectiveUser';
import { POST_STATUS } from '@/lib/constants';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zdvedfnpipgygvikoooa.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1EEA1MtGEqz8vWJAApQM6Q_FnjK-aaw';

export type ContentPost = {
  id: string;
  user_id: string;
  status: string;
  idea_title?: string;
  script?: string;
  hook?: string;
  beats?: string;
  cta?: string;
  caption?: string;
  hashtags?: string;
  final_video_url?: string;
  background_video_url?: string;
  style_token_id?: string;
  source_url?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at?: string;
};

function getEffectiveUserIdFromReq(req: NextRequest, user: { id: string } | null): string | null {
  const uid = getEffectiveUserId(user?.id ?? null);
  if (uid) return uid;
  const demoHeader = req.headers.get('x-demo-mode') === 'true';
  const demoCookie = req.cookies.get('octane_demo_mode')?.value === 'true';
  return demoHeader || demoCookie ? 'demo_user_mvp_v1' : null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveUserId = getEffectiveUserIdFromReq(req, user);
    if (!effectiveUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabase.from('content_posts').select('*').eq('user_id', effectiveUserId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      // Table may not exist; return empty for now (demo will use localStorage fallback in UI)
      return NextResponse.json({ posts: [] });
    }
    return NextResponse.json({ posts: data || [] });
  } catch (err) {
    console.error('posts GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveUserId = getEffectiveUserIdFromReq(req, user);
    if (!effectiveUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { idea_title, status = POST_STATUS.IDEA } = body;

    const row = {
      user_id: effectiveUserId,
      status,
      idea_title: idea_title || 'Untitled idea',
      script: body.script || null,
      hook: body.hook || null,
      beats: body.beats || null,
      cta: body.cta || null,
      caption: body.caption || null,
      hashtags: body.hashtags || null,
      final_video_url: body.final_video_url || null,
      background_video_url: body.background_video_url || null,
      style_token_id: body.style_token_id || null,
      source_url: body.source_url || null,
      scheduled_at: body.scheduled_at || null,
    };

    const { data, error } = await supabase.from('content_posts').insert(row).select().single();
    if (error) {
      // Table may not exist
      const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      return NextResponse.json({
        post: { ...row, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      });
    }
    return NextResponse.json({ post: data });
  } catch (err) {
    console.error('posts POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
