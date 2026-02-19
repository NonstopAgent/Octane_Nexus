import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import type { StyleTokensPayload } from '@/lib/style-tokens';

/**
 * PATCH: Update a style token. Ownership enforced.
 * Body: { name?: string, tokens?: StyleTokensPayload, is_default?: boolean }
 */
export async function PATCH(
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

    const body = await req.json().catch(() => ({}));
    const updates: { name?: string; tokens?: StyleTokensPayload; is_default?: boolean } = {};

    if (typeof body?.name === 'string') updates.name = body.name.trim();
    if (typeof body?.tokens === 'object' && body.tokens !== null) updates.tokens = body.tokens;
    if (typeof body?.is_default === 'boolean') updates.is_default = body.is_default;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    if (updates.is_default === true) {
      await db.from('style_tokens').update({ is_default: false }).eq('user_id', userId);
    }

    const { data, error } = await db
      .from('style_tokens')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, user_id, name, tokens, is_default, created_at')
      .single();

    if (error) {
      console.error('style-tokens PATCH error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found or not owned' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('style-tokens PATCH error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
