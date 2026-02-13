import { NextRequest, NextResponse } from 'next/server';
import { analyzeIdea } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idea, niche } = body as { idea: string; niche: string };

    if (!idea?.trim()) {
      return NextResponse.json({ error: 'idea is required' }, { status: 400 });
    }

    const analysis = await analyzeIdea(idea.trim(), niche?.trim() || 'content creator');
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('analyze-idea error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
