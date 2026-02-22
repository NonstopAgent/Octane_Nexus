'use server';

import { revalidatePath } from 'next/cache';
import { createNewVersionFromPost } from '@/lib/versioning';

/**
 * Create a new version from an existing post (e.g. when Regenerating from READY).
 * Returns newPostId for the client to run asset generation on.
 */
export async function createVersionAction(args: {
  postId: string;
  createdFromAction: string;
}): Promise<{ newPostId: string } | { error: string }> {
  const { createServerSupabaseClient } = await import('@/lib/supabaseServer');
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Please sign in.' };
  }

  const result = await createNewVersionFromPost({
    postId: args.postId,
    userId: user.id,
    createdFromAction: args.createdFromAction,
  });

  if ('error' in result) {
    return result;
  }

  revalidatePath('/dashboard/production');
  revalidatePath('/dashboard/post-lab');
  return result;
}
