import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  storeArtifact,
  getRecentArtifacts,
  getArtifactsByType,
  type ArtifactType,
  type CreateArtifactInput,
} from '@/lib/creatorMemory';

export const dynamic = 'force-dynamic';

const VALID_TYPES: ArtifactType[] = [
  'script', 'hook', 'caption', 'idea', 'post', 'note', 'feedback', 'voice_sample',
];

/**
 * GET /api/memory/artifacts
 * Optional query params:
 *   ?type=script|hook|caption|idea|post|note|feedback|voice_sample
 *   ?limit=20  (default 20, max 100)
 * Returns: { artifacts: CreatorArtifact[] }
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 100);

    let artifacts;
    if (typeParam && VALID_TYPES.includes(typeParam as ArtifactType)) {
      artifacts = await getArtifactsByType(supabase, user.id, typeParam as ArtifactType, limit);
    } else {
      artifacts = await getRecentArtifacts(supabase, user.id, limit);
    }

    return NextResponse.json({ artifacts });
  } catch (err) {
    console.error('GET /api/memory/artifacts error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/memory/artifacts
 * Body: {
 *   artifact_type: ArtifactType (required),
 *   content: string (required),
 *   title?: string,
 *   platform?: string,
 *   topic?: string,
 *   source?: ArtifactSource,
 *   starred?: boolean,
 *   user_rating?: -1 | 0 | 1,
 *   metadata?: Record<string, unknown>,
 * }
 * Returns: { artifact: CreatorArtifact }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const artifact_type = body.artifact_type;
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!artifact_type || !VALID_TYPES.includes(artifact_type)) {
      return NextResponse.json(
        { error: `artifact_type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }
    if (content.length > 20000) {
      return NextResponse.json({ error: 'content too long (max 20k chars)' }, { status: 400 });
    }

    const input: CreateArtifactInput = {
      artifact_type,
      content,
      title: typeof body.title === 'string' ? body.title.trim().slice(0, 200) : undefined,
      platform: typeof body.platform === 'string' ? body.platform : undefined,
      topic: typeof body.topic === 'string' ? body.topic.slice(0, 200) : undefined,
      source: typeof body.source === 'string' ? body.source : 'user_input',
      starred: typeof body.starred === 'boolean' ? body.starred : undefined,
      user_rating: typeof body.user_rating === 'number' ? body.user_rating : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : undefined,
    };

    const artifact = await storeArtifact(supabase, user.id, input);
    if (!artifact) {
      return NextResponse.json({ error: 'Failed to save artifact' }, { status: 500 });
    }

    return NextResponse.json({ artifact });
  } catch (err) {
    console.error('POST /api/memory/artifacts error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
