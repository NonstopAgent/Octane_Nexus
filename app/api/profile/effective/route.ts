import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest, DEMO_USER_ID } from '@/lib/authServer';

export const dynamic = 'force-dynamic';

const DEMO_NICHE = 'ai trading & market insights';

/**
 * GET: Returns effective user's profile slice for reminder logic.
 * { niche: string | null, finance_disclaimer_enabled: boolean }
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ niche: null, finance_disclaimer_enabled: true });
    }

    if (userId === DEMO_USER_ID) {
      return NextResponse.json({ niche: DEMO_NICHE, finance_disclaimer_enabled: true });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();
    const { data: profile } = await db
      .from('profiles')
      .select('niche, finance_disclaimer_enabled')
      .eq('id', userId)
      .maybeSingle();

    const niche = (profile?.niche as string) ?? null;
    const finance_disclaimer_enabled = profile?.finance_disclaimer_enabled !== false;
    return NextResponse.json({ niche, finance_disclaimer_enabled });
  } catch (e) {
    console.error('profile/effective error:', e);
    return NextResponse.json({ niche: null, finance_disclaimer_enabled: true });
  }
}
