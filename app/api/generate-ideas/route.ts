import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateVideoConcepts } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

/**
 * POST /api/generate-ideas
 * Body: { niche: string }
 * Returns: VideoConcept[] — array of { title, angle, visual, ... }
 *
 * This wraps lib/gemini#generateVideoConcepts so the GEMINI_API_KEY
 * never needs to be exposed to the browser.
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

    const concepts = await generateVideoConcepts(niche);
    return NextResponse.json({ concepts });
  } catch (error: unknown) {
    console.error('generate-ideas error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
