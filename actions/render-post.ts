'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { finalizeVideoById } from '@/lib/simulator';

export type RenderResult =
  | { ok: true; bucket?: string }
  | { ok: false; error: string; code?: string };

function toErrorString(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function getErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code?: string }).code === 'string') {
    return (err as { code: string }).code;
  }
  return undefined;
}

export async function renderPostAction(postId: string): Promise<RenderResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return {
        ok: false,
        error: `Auth error: ${authError.message}${authError.code ? ` (${authError.code})` : ''}`,
        code: authError.code,
      };
    }
    if (!user) {
      return { ok: false, error: 'Not authenticated', code: 'UNAUTHENTICATED' };
    }

    const { bucket } = await finalizeVideoById(postId, user.id);

    revalidatePath('/dashboard/post-lab');
    revalidatePath('/dashboard/production');
    return { ok: true, bucket };
  } catch (err) {
    const error = toErrorString(err);
    const code = getErrorCode(err);
    return { ok: false, error, code };
  }
}
