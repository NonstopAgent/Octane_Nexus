import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateVideoIdeas } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { niche, topic, userId } = body as { niche: string; topic?: string; userId?: string };

    if (!niche?.trim()) {
      return NextResponse.json({ error: 'niche is required' }, { status: 400 });
    }

    const ideas = await generateVideoIdeas({ niche: niche.trim(), topic: topic?.trim(), userId });
    return NextResponse.json(ideas);
  } catch (error: unknown) {
    console.error('generate-ideas error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
