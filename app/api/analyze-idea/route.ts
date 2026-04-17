import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { buildCreatorPerformanceContext } from '@/lib/hookLab';
import { analyzeIdea } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { idea, niche } = body as { idea?: string; niche?: string };

    if (!idea?.trim()) {
      return NextResponse.json({ error: 'idea is required' }, { status: 400 });
    }

    let performanceContext: string | undefined;
    try {
      const admin = createServiceRoleClient();
      performanceContext = await buildCreatorPerformanceContext(admin, user.id);
    } catch {
      performanceContext = undefined;
    }

    const analysis = await analyzeIdea(
      idea.trim(),
      niche?.trim() || 'content creator',
      performanceContext
    );
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error('analyze-idea error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
