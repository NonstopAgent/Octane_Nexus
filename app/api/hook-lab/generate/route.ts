import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { buildCreatorPerformanceContext, generateHookLabHooks } from '@/lib/hookLab';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : '';
  if (!topic || topic.length > 500) {
    return NextResponse.json({ error: 'topic is required (max 500 chars)' }, { status: 400 });
  }

  try {
    const admin = createServiceRoleClient();
    const contextBlock = await buildCreatorPerformanceContext(admin, user.id);
    const hooks = await generateHookLabHooks(topic, contextBlock);

    if (!hooks?.length) {
      return NextResponse.json(
        { error: 'Could not generate hooks. Check GEMINI_API_KEY and try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ hooks });
  } catch (err) {
    console.error('hook-lab generate:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
