import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateScript } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

/**
 * POST /api/generate-script
 * Body: { title: string, angle?: string, visual?: string }
 * Returns: { hook, body, cta }
 *
 * This wraps lib/gemini#generateScript so the GEMINI_API_KEY
 * never needs to be exposed to the browser.
 */
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const angle = typeof body?.angle === 'string' ? body.angle.trim() : '';
    const visual = typeof body?.visual === 'string' ? body.visual.trim() : '';

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const script = await generateScript(title, angle, visual);
    return NextResponse.json({ script });
  } catch (error: unknown) {
    console.error('generate-script error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
