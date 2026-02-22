import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { computeRiskScore } from '@/lib/riskScore';

/**
 * POST: Get risk score for a source URL (Clip It safety check).
 * Body: { sourceUrl: string, platformTarget?: string, title?, description?, channelName?, isUploaderChannel?, thumbnailUrl? }
 * Effective user aware; no service role needed (stateless).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const sourceUrl = typeof body?.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
    if (!sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 });
    }

    const result = computeRiskScore({
      sourceUrl,
      platformTarget: typeof body?.platformTarget === 'string' ? body.platformTarget : undefined,
      title: typeof body?.title === 'string' ? body.title : undefined,
      description: typeof body?.description === 'string' ? body.description : undefined,
      channelName: typeof body?.channelName === 'string' ? body.channelName : undefined,
      isUploaderChannel: typeof body?.isUploaderChannel === 'boolean' ? body.isUploaderChannel : undefined,
      thumbnailUrl: typeof body?.thumbnailUrl === 'string' ? body.thumbnailUrl : undefined,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error('risk/score error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
