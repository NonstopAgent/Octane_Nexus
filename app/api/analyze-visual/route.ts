import { NextRequest, NextResponse } from 'next/server';
import { analyzeVisualContent } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mediaUrl, platform, vibe } = body as {
      mediaUrl: string;
      platform: 'instagram' | 'tiktok' | 'youtube' | 'x';
      vibe: string;
    };

    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return NextResponse.json({ error: 'mediaUrl is required' }, { status: 400 });
    }

    const res = await fetch(mediaUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 400 });
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    const result = await analyzeVisualContent(
      base64,
      contentType,
      platform || 'instagram',
      vibe || 'engaging'
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('analyze-visual error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
