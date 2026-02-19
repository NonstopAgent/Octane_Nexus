import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';

/**
 * GET: Return user_settings for effective user, including default style token if set.
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

    const { data: settings, error: settingsErr } = await db
      .from('user_settings')
      .select('user_id, default_style_token_id, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsErr) {
      console.error('user-settings GET error:', settingsErr);
      return NextResponse.json({ error: settingsErr.message }, { status: 500 });
    }

    const default_style_token_id = settings?.default_style_token_id ?? null;
    let default_style_token = null;

    if (default_style_token_id) {
      const { data: token } = await db
        .from('style_tokens')
        .select('id, user_id, name, tokens, is_default, created_at')
        .eq('id', default_style_token_id)
        .eq('user_id', userId)
        .maybeSingle();
      default_style_token = token;
    }

    return NextResponse.json({
      user_id: userId,
      default_style_token_id: default_style_token_id as string | null,
      default_style_token: default_style_token as Record<string, unknown> | null,
      created_at: settings?.created_at ?? null,
      updated_at: settings?.updated_at ?? null,
    });
  } catch (e) {
    console.error('user-settings GET error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
