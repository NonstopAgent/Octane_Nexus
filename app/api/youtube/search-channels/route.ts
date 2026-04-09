import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { searchYouTubeChannels } from '@/lib/youtubeOAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/youtube/search-channels?q=mkbhd
 * Searches YouTube for channels matching the query.
 * Used by the tracked channels picker UI.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();
    if (!query) {
      return NextResponse.json({ channels: [] });
    }
    if (query.length > 100) {
      return NextResponse.json({ error: 'Query too long' }, { status: 400 });
    }

    const channels = await searchYouTubeChannels(query);
    return NextResponse.json({ channels });
  } catch (err) {
    console.error('GET /api/youtube/search-channels error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 500 }
    );
  }
}
