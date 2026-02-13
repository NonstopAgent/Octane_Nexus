'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { POST_STATUS } from '@/lib/status';

type SchedulePostParams = {
  postId: string;
  caption: string;
  hashtags: string[];
  scheduledDate: string | null;
  platform: string;
};

function isValidScheduledDate(value: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  const t = new Date(value).getTime();
  return Number.isFinite(t);
}

export async function schedulePost(params: SchedulePostParams): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient();
  const { postId, caption, hashtags, scheduledDate, platform } = params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Please sign in to schedule.' };
  }

  if (!isValidScheduledDate(scheduledDate)) {
    return { error: 'Please pick a date/time.' };
  }

  const scheduledIso = new Date(scheduledDate!).toISOString();

  const updatePayload: Record<string, unknown> = {
    caption: caption || null,
    hashtags: hashtags.filter(Boolean) || [],
    scheduled_date: scheduledIso,
    platform: platform || null,
    status: POST_STATUS.SCHEDULED,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('content_posts')
    .update(updatePayload)
    .eq('id', postId)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Failed to schedule: ' + error.message };
  }

  revalidatePath('/dashboard/post-lab');
  revalidatePath('/dashboard/schedule');

  return {};
}
