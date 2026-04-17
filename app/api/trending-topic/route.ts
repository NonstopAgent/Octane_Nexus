import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getTrendingTopic } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

/**
 * POST /api/trending-topic
 * Body: { niche: string }
 * Returns: { topic: string }
 *
 * Thin wrapper around lib/gemini#getTrendingTopic so IdeaLab.tsx can
 * call it from the browser without needing GEMINI_API_KEY client-side.
 */
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const niche = typeof body?.niche === 'string' ? body.niche.trim() : '';
    if (!niche) {
      return NextResponse.json({ error: 'niche is required' }, { status: 400 });
    }

    const topic = await getTrendingTopic(niche);
    return NextResponse.json({ topic });
  } catch (error: unknown) {
    console.error('trending-topic error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
