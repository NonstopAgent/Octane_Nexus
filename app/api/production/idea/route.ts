import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { POST_STATUS } from '@/lib/status';

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

    const body = await req.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('content_posts')
      .insert({
        user_id: userId,
        title,
        status: POST_STATUS.IDEA,
      })
      .select('id')
      .single();

    if (error) {
      console.error('production/idea insert error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create idea' },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data?.id });
  } catch (e) {
    console.error('production/idea error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
