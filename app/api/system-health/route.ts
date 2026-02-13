import { NextResponse } from 'next/server';

/**
 * Dev-only: returns system health for storage/render pipeline.
 * Not exposed in production.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const serviceRolePresent = !!(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
  );

  let videosBucketExists = false;
  if (serviceRolePresent && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key!);
      const { data: buckets, error } = await supabase.storage.listBuckets();
      videosBucketExists = !error && (buckets ?? []).some((b) => b.name === 'videos');
    } catch {
      videosBucketExists = false;
    }
  }

  return NextResponse.json({
    serviceRolePresent,
    videosBucketExists,
  });
}
