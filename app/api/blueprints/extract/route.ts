import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { POST_STATUS } from '@/lib/status';

type RemakePack = {
  hook: string;
  meat: string[];
  cta: string;
  setup_tip?: string;
  style_tokens?: string[];
};

/**
 * Generate a Remake Pack (stub) from source URL/title. In production could use Gemini/YouTube API.
 */
function generateRemakePack(sourceUrl: string, title?: string): RemakePack {
  const base = title && title.trim() ? title.trim().slice(0, 80) : new URL(sourceUrl).pathname.slice(1) || 'Extracted clip';
  return {
    hook: `Turn this into your own angle: "${base}"`,
    meat: [
      'Reframe the core idea in your voice',
      'Add a personal story or example',
      'Keep the payoff clear and actionable',
    ],
    cta: 'Try it your way and tag me.',
    setup_tip: 'Film in your space; use your own B-roll to avoid copyright.',
    style_tokens: ['conversational', 'hook-first', 'clear-cta'],
  };
}

/**
 * POST: Extract blueprint + record in rights_ledger + save Remake Pack.
 * Body: {
 *   sourceUrl, targetPlatform?, riskLevel, riskReasons (string[]),
 *   actionTaken: 'clip'|'remake', attestationAccepted: boolean
 * }
 * Requires attestationAccepted. Always creates ledger row and Remake Pack.
 * If actionTaken === 'clip', also creates a content_posts idea.
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
    const targetPlatform = typeof body?.targetPlatform === 'string' ? body.targetPlatform.trim() || null : null;
    const riskLevel = typeof body?.riskLevel === 'string' ? body.riskLevel : 'low';
    const riskReasons = Array.isArray(body?.riskReasons) ? body.riskReasons : [];
    const actionTaken = body?.actionTaken === 'remake' ? 'remake' : 'clip';
    const attestationAccepted = body?.attestationAccepted === true;
    const title = typeof body?.title === 'string' ? body.title.trim() : null;

    if (!sourceUrl) {
      return NextResponse.json({ error: 'sourceUrl is required' }, { status: 400 });
    }
    if (!attestationAccepted) {
      return NextResponse.json({ error: 'Attestation is required before proceeding' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const now = new Date().toISOString();

    const { error: ledgerErr } = await db.from('rights_ledger').insert({
      user_id: userId,
      source_url: sourceUrl,
      risk_level: riskLevel,
      risk_reasons: riskReasons,
      target_platform: targetPlatform,
      action_taken: actionTaken,
      attestation_accepted: true,
      updated_at: now,
    });

    if (ledgerErr) {
      console.error('rights_ledger insert error:', ledgerErr);
      return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 });
    }

    const remakePack = generateRemakePack(sourceUrl, title ?? undefined);
    const ideaLabel = `[Remake Pack] ${title || sourceUrl.slice(0, 50)}`;

    const { error: bpErr } = await db.from('saved_blueprints').insert({
      user_id: userId,
      idea: ideaLabel,
      blueprint: remakePack,
      created_at: now,
    });

    if (bpErr) {
      console.warn('saved_blueprints insert (Remake Pack) failed:', bpErr.message);
      // Continue; ledger was written
    }

    let contentPostId: string | null = null;
    if (actionTaken === 'clip') {
      const insertTitle = title || 'Clip from trend';
      const { data: post, error: postErr } = await db
        .from('content_posts')
        .insert({
          user_id: userId,
          title: insertTitle,
          script_content: {
            hook: remakePack.hook,
            meat: remakePack.meat,
            cta: remakePack.cta,
          },
          status: POST_STATUS.SCRIPTING,
        })
        .select('id')
        .single();

      if (!postErr && post) contentPostId = post.id;
    }

    return NextResponse.json({
      ok: true,
      actionTaken,
      remakePackSaved: !bpErr,
      contentPostId,
    });
  } catch (e) {
    console.error('blueprints/extract error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
