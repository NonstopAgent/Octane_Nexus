import { NextRequest, NextResponse } from 'next/server';
import { generateVideoScript } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, userId } = body as { topic: string; userId?: string };

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const variations = await generateVideoScript({ topic: topic.trim(), userId });
    return NextResponse.json(variations);
  } catch (error: unknown) {
    console.error('generate-script error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
