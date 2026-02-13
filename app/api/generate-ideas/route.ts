import { NextRequest, NextResponse } from 'next/server';
import { generateVideoIdeas } from '@/lib/gemini';

export async function POST(req: NextRequest) {
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
