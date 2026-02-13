import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { scoreInstagramPost } from '@/lib/instagram/quality';

const MEDIA_VALUES = ['image', 'video', 'carousel'] as const;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const caption = typeof body.caption === 'string' ? body.caption : '';
    const hashtags = Array.isArray(body.hashtags) ? body.hashtags.filter((h: unknown): h is string => typeof h === 'string') : [];
    const media_type = body.media_type as string;
    const useAI = Boolean(body.useAI);

    if (!media_type || !(MEDIA_VALUES as readonly string[]).includes(media_type)) {
      return NextResponse.json({ error: 'Invalid media_type' }, { status: 400 });
    }

    const result = await scoreInstagramPost(
      { caption, hashtags, media_type: media_type as 'image' | 'video' | 'carousel' },
      useAI
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('Instagram score error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to score post' },
      { status: 500 }
    );
  }
}
