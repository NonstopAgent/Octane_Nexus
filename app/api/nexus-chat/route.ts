import { NextRequest, NextResponse } from 'next/server';
import { chatWithNexus, type NexusChatMessage } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userId } = body as { messages: NexusChatMessage[]; userId: string };

    if (!messages?.length || !userId) {
      return NextResponse.json(
        { error: 'messages and userId are required' },
        { status: 400 }
      );
    }

    const reply = await chatWithNexus(messages as NexusChatMessage[], userId);
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('nexus-chat error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
