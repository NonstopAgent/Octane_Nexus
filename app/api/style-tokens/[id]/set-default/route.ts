import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

/**
 * POST: Set this style token as default. Clears is_default on other tokens and updates user_settings.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const { data: token, error: tokenErr } = await db
      .from('style_tokens')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (tokenErr || !token) {
      return NextResponse.json({ error: 'Not found or not owned' }, { status: 404 });
    }

    await db.from('style_tokens').update({ is_default: false }).eq('user_id', userId);
    await db.from('style_tokens').update({ is_default: true }).eq('id', id).eq('user_id', userId);

    const { error: upsertErr } = await db.from('user_settings').upsert(
      {
        user_id: userId,
        default_style_token_id: id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertErr) {
      console.error('style-tokens set-default user_settings error:', upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ default_style_token_id: id });
  } catch (e) {
    console.error('style-tokens set-default error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
