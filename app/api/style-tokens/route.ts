import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import type { StyleTokensPayload } from '@/lib/style-tokens';

/**
 * GET: List style tokens for the effective user.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data, error } = await db
      .from('style_tokens')
      .select('id, user_id, name, tokens, is_default, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('style-tokens GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('style-tokens GET error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a style token.
 * Body: { name: string, tokens?: StyleTokensPayload, is_default?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const tokens: StyleTokensPayload = typeof body?.tokens === 'object' && body.tokens !== null
      ? body.tokens
      : {};
    const is_default = Boolean(body?.is_default);

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    if (is_default) {
      await db.from('style_tokens').update({ is_default: false }).eq('user_id', userId);
    }

    const { data: row, error } = await db
      .from('style_tokens')
      .insert({
        user_id: userId,
        name,
        tokens,
        is_default,
      })
      .select('id, user_id, name, tokens, is_default, created_at')
      .single();

    if (error) {
      console.error('style-tokens POST error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(row);
  } catch (e) {
    console.error('style-tokens POST error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
