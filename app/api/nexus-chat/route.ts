import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { chatWithNexus, type NexusChatMessage } from '@/lib/gemini';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { storeArtifact } from '@/lib/creatorMemory';

/** Text of a chat turn, tolerating both shapes the app produces. */
function turnText(m: NexusChatMessage | undefined): string {
  if (!m) return '';
  if (typeof m.content === 'string' && m.content.trim()) return m.content.trim();
  return (m.parts?.map((p) => p?.text || '').join('') || '').trim();
}

/**
 * Store one question/answer pair as a note the brief generator and future
 * chats can draw on. Never throws.
 */
async function captureExchange(
  userId: string,
  messages: NexusChatMessage[],
  reply: string
): Promise<void> {
  try {
    const question = turnText(messages[messages.length - 1]);
    if (!question || !reply?.trim()) return;

    // Greetings and one-word prods are not worth remembering, and filling
    // memory with "hey" makes the useful entries harder to find.
    if (question.length < 12) return;

    const admin = createServiceRoleClient();
    await storeArtifact(admin, userId, {
      artifact_type: 'note',
      title: question.slice(0, 80),
      content: `Q: ${question}\n\nNexus: ${reply}`,
      source: 'auto_capture',
      metadata: { captured_from: 'nexus_chat' },
    });
  } catch (err) {
    console.warn('nexus-chat: memory capture failed (non-fatal)', err);
  }
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

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

    // Automatic memory.
    //
    // Memory used to require the creator to notice a "Save to memory" button
    // and press it, which meant Nexus only remembered the exchanges someone
    // remembered to file. That is backwards: the assistant should accumulate
    // context by using it, the way ChatGPT and Claude do.
    //
    // Deliberately fire-and-forget and fully swallowed. A memory write must
    // never turn a working answer into a failed request.
    void captureExchange(session.user.id, messages as NexusChatMessage[], reply);

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error('nexus-chat error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
