'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { POST_STATUS } from '@/lib/status';

/** Sample video URL for "ready" posts (vertical fitness demo) */
const DEMO_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

type ScriptContent = {
  hook?: string;
  meat?: string[];
  cta?: string;
};

/** Returns next week same day, 2pm local-ish */
function nextWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(14, 0, 0, 0);
  return d.toISOString();
}

export async function seedDemoData(): Promise<{ count: number } | { error: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please sign in to seed demo data.' };
  }

  const userId = user.id;
  const now = new Date().toISOString();
  const nextWeekDate = nextWeek();

  const ideas = [
    { title: 'Why Dads Need Kettlebells', status: POST_STATUS.IDEA },
    { title: 'Stop Doing Crunches — Try This Instead', status: POST_STATUS.IDEA },
    { title: 'The Dad Bod Fix in 15 Minutes', status: POST_STATUS.IDEA },
  ];

  const scripts: { title: string; script_content: ScriptContent }[] = [
    {
      title: '5 Exercises Every Busy Dad Should Do',
      script_content: {
        hook: 'If you only have 10 minutes, do these 5 moves.',
        meat: [
          'Goblet squats — build legs and core.',
          'Push-ups — no equipment needed.',
          'Kettlebell swings — full body burn.',
          'Plank — stability and abs.',
          'Jump rope — cardio in your driveway.',
        ],
        cta: 'Save this and try it tomorrow. Your future self will thank you.',
      },
    },
    {
      title: 'The Truth About Dad Bod',
      script_content: {
        hook: 'Dad bod isn’t a curse — it’s a choice.',
        meat: [
          'You don’t need 2 hours in the gym.',
          'Three 20-minute sessions per week can change everything.',
          'Sleep, protein, and consistency beat perfection.',
        ],
        cta: 'Follow for more realistic fitness tips for dads.',
      },
    },
    {
      title: 'Why I Quit the Gym (And You Should Too)',
      script_content: {
        hook: 'I saved $60/month and got fitter at home.',
        meat: [
          'Resistance bands and a kettlebell cost less than one month’s membership.',
          'No commute, no waiting for equipment.',
          'Work out while the kids sleep.',
        ],
        cta: 'Link in bio for my home setup — under $100.',
      },
    },
  ];

  const readyPosts = [
    { title: 'The 10-Minute Dad Workout That Actually Works' },
    { title: 'Stop Making Excuses — Start With One Push-Up' },
  ];

  const scheduledPosts = [
    { title: 'Kettlebells vs Dumbbells for Busy Dads' },
    { title: 'How I Lost 20 lbs Without a Gym' },
  ];

  const rows: Record<string, unknown>[] = [];

  for (const { title, status } of ideas) {
    rows.push({
      user_id: userId,
      title,
      script_content: null,
      status,
      created_at: now,
      updated_at: now,
    });
  }

  for (const { title, script_content } of scripts) {
    rows.push({
      user_id: userId,
      title,
      script_content,
      status: POST_STATUS.SCRIPTING,
      created_at: now,
      updated_at: now,
    });
  }

  for (const { title } of readyPosts) {
    rows.push({
      user_id: userId,
      title,
      script_content: {
        hook: 'Watch till the end for the full routine.',
        meat: ['Full 10-minute workout demo.', 'No equipment needed.'],
        cta: 'Save and share with a dad who needs this.',
      },
      status: POST_STATUS.READY,
      final_video_url: DEMO_VIDEO_URL,
      background_video_url: DEMO_VIDEO_URL,
      created_at: now,
      updated_at: now,
    });
  }

  for (const { title } of scheduledPosts) {
    rows.push({
      user_id: userId,
      title,
      script_content: {
        hook: 'Coming next week — the full comparison.',
        meat: ['Kettlebells vs dumbbells for home gym.'],
        cta: 'Turn on notifications so you don’t miss it.',
      },
      status: POST_STATUS.SCHEDULED,
      final_video_url: DEMO_VIDEO_URL,
      scheduled_date: nextWeekDate,
      platform: 'TikTok',
      caption: 'Fitness dads — which do you prefer?',
      hashtags: ['fitness', 'dadlife', 'homegym', 'kettlebells'],
      created_at: now,
      updated_at: now,
    });
  }

  const { error } = await supabase.from('content_posts').insert(rows);

  if (error) {
    return { error: 'Failed to seed: ' + error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/production');
  revalidatePath('/dashboard/post-lab');
  revalidatePath('/dashboard/schedule');

  return { count: rows.length };
}
