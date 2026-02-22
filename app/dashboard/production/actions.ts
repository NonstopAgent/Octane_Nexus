'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromCookieStore } from '@/lib/authServer';
import {
  createIdea,
  draftScript,
  simulateFilming,
  finalizeVideo,
} from '@/lib/simulator';
import { POST_STATUS } from '@/lib/status';

export async function runOneHourSimulation(): Promise<
  { success: boolean; error?: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const userId = getEffectiveUserIdFromCookieStore(cookieStore, user?.id ?? null);

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // 1. Create 3 ideas
    for (let i = 0; i < 3; i++) {
      await createIdea(userId);
    }

    // 2. Get existing ideas for drafting
    const { data: ideaPosts } = await supabase
      .from('content_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', POST_STATUS.IDEA)
      .order('updated_at', { ascending: false })
      .limit(5);

    const ideaIds = (ideaPosts ?? []).map((p) => p.id);
    for (let i = 0; i < Math.min(2, ideaIds.length); i++) {
      await draftScript(ideaIds[i], userId);
    }

    // 3. Get scripting posts for filming
    const { data: scriptingPosts } = await supabase
      .from('content_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', POST_STATUS.SCRIPTING)
      .order('updated_at', { ascending: false })
      .limit(3);

    const scriptingIds = (scriptingPosts ?? []).map((p) => p.id);
    if (scriptingIds.length > 0) {
      await simulateFilming(scriptingIds[0], userId);
    }

    // 4. Finalize one filming post to ready
    await finalizeVideo(userId);

    revalidatePath('/dashboard/production');
    revalidatePath('/dashboard/post-lab');
    return { success: true };
  } catch (err) {
    console.error('runOneHourSimulation error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Simulation failed',
    };
  }
}
