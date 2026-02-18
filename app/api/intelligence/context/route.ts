import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromRequest } from '@/lib/authServer';
import { buildNexusIntelligence } from '@/lib/intelligence/orchestrator';
import type { NexusUserProfile } from '@/lib/intelligence/profile';
import type { HistoricalPostData } from '@/lib/intelligence/patterns';

function formatHour(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = getEffectiveUserIdFromRequest(req, user?.id ?? null);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = user?.id === userId ? supabase : createServiceRoleClient();

    const { data: profile } = await db
      .from('profiles')
      .select('niche, brand_vision')
      .eq('id', userId)
      .maybeSingle();

    const niche = (profile?.niche ?? profile?.brand_vision ?? '')?.toString().trim() || 'Not set';

    const minimalProfile: NexusUserProfile = {
      identity: {
        niche,
        businessType: 'creator',
        primaryGoal: 'growth',
        platformFocus: [],
        experienceLevel: 'intermediate',
      },
      behavior: { avgPostsPerWeek: 0 },
      performance: {
        averagePredictedScore: 0,
        averageActualScore: 0,
        predictionBias: 0,
      },
    };

    const { data: igPosts } = await db
      .from('instagram_posts')
      .select('quality_score, posted_at')
      .eq('user_id', userId)
      .not('posted_at', 'is', null);

    const historicalPosts: HistoricalPostData[] = (igPosts ?? []).map((p) => ({
      platform: 'instagram' as const,
      format: 'reel',
      predictedScore: typeof p.quality_score === 'number' ? p.quality_score : 0,
      actualScore: typeof p.quality_score === 'number' ? p.quality_score : 0,
      postedAt: typeof p.posted_at === 'string' ? p.posted_at : new Date().toISOString(),
    }));

    const output = buildNexusIntelligence({
      historicalPosts,
      userProfile: minimalProfile,
    });

    const activeFlags = (Object.entries(output.strategicFlags) as [string, boolean][])
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim());

    return NextResponse.json({
      niche,
      bestFormat: output.growthContext.bestFormat ?? null,
      bestPostingHours: output.growthContext.bestPostingHours?.map(formatHour) ?? null,
      strongestPlatform: output.growthContext.strongestPlatform ?? null,
      strategicFlags: activeFlags,
    });
  } catch (e) {
    console.error('intelligence/context error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
