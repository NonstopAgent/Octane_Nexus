import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { generateInstagramCaption } from '@/lib/instagram/caption';

const TONE_VALUES = ['bold', 'casual', 'story', 'educational', 'luxury', 'motivational'] as const;
const GOAL_VALUES = ['growth', 'engagement', 'sales', 'authority'] as const;
const MEDIA_VALUES = ['image', 'video', 'carousel'] as const;

function mapTone(t: string): 'bold' | 'educational' | 'casual' | 'luxury' | 'motivational' {
  if (t === 'story') return 'educational';
  if (TONE_VALUES.includes(t as (typeof TONE_VALUES)[number])) return t as 'bold' | 'educational' | 'casual' | 'luxury' | 'motivational';
  return 'casual';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const media_type = body.media_type as string;
    const tone = body.tone as string;
    const goal = body.goal as string;
    const niche = typeof body.niche === 'string' ? body.niche.trim() : '';
    const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k: unknown): k is string => typeof k === 'string') : undefined;

    if (!media_type || !(MEDIA_VALUES as readonly string[]).includes(media_type)) {
      return NextResponse.json({ error: 'Invalid media_type' }, { status: 400 });
    }
    if (!niche) {
      return NextResponse.json({ error: 'niche is required' }, { status: 400 });
    }
    if (!goal || !(GOAL_VALUES as readonly string[]).includes(goal)) {
      return NextResponse.json({ error: 'Invalid goal' }, { status: 400 });
    }

    const result = await generateInstagramCaption({
      niche,
      goal: goal as 'growth' | 'engagement' | 'sales' | 'authority',
      tone: mapTone(tone || 'casual'),
      media_type: media_type as 'image' | 'video' | 'carousel',
      keywords,
    });

    return NextResponse.json({
      caption: result.caption,
      hashtags: result.hashtags,
      ...(result.firstComment && { firstComment: result.firstComment }),
    });
  } catch (err) {
    console.error('Instagram caption error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate caption' },
      { status: 500 }
    );
  }
}
