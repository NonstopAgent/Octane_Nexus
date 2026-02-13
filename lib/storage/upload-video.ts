/**
 * Server-only: Upload video from URL to Supabase Storage.
 * Uses service role for upload so RLS/storage policies don't block.
 * Do not import from client components.
 */

import { createServiceRoleClient } from '@/lib/supabaseServer';

const VIDEOS_BUCKET = 'videos';
const FALLBACK_BUCKET = 'assets';

export type UploadVideoResult = {
  publicUrl: string;
  objectPath: string;
  bucket: string;
};

/**
 * Fetch MP4 from sourceUrl and upload to Supabase Storage.
 * Prefers bucket "videos"; falls back to "assets" if videos does not exist.
 */
export async function uploadVideoFromUrl(args: {
  sourceUrl: string;
  path: string;
}): Promise<UploadVideoResult> {
  const { sourceUrl, path } = args;

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch video from ${sourceUrl}: ${res.status} ${res.statusText}`
    );
  }

  const buffer = await res.arrayBuffer();
  const supabase = createServiceRoleClient();

  const tryBucket = async (bucket: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (error) {
      if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
        return null;
      }
      throw error;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return {
      publicUrl: urlData.publicUrl,
      objectPath: data.path,
      bucket,
    };
  };

  let result = await tryBucket(VIDEOS_BUCKET);
  if (result) return result;

  console.warn(
    `[upload-video] Bucket "${VIDEOS_BUCKET}" not found. Fallback to "${FALLBACK_BUCKET}". Run migration 20250215000000_videos_bucket.sql to create it.`
  );

  result = await tryBucket(FALLBACK_BUCKET);
  if (result) {
    console.warn(
      `[upload-video] Using fallback bucket "${FALLBACK_BUCKET}". Create "videos" bucket via migration for production.`
    );
    return result;
  }

  throw new Error(
    `Neither bucket "${VIDEOS_BUCKET}" nor "${FALLBACK_BUCKET}" is available. ` +
      `Run migration 20250215000000_videos_bucket.sql or ensure "${FALLBACK_BUCKET}" exists.`
  );
}

/**
 * Upload MP4 buffer to Supabase Storage.
 * Prefers bucket "videos"; falls back to "assets" if videos does not exist.
 */
export async function uploadVideoBuffer(args: {
  buffer: Buffer;
  path: string;
}): Promise<UploadVideoResult> {
  const { buffer, path: objectPath } = args;
  const supabase = createServiceRoleClient();

  const tryBucket = async (bucket: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, buffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (error) {
      if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
        return null;
      }
      throw error;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    return {
      publicUrl: urlData.publicUrl,
      objectPath: data.path,
      bucket,
    };
  };

  let result = await tryBucket(VIDEOS_BUCKET);
  if (result) return result;

  result = await tryBucket(FALLBACK_BUCKET);
  if (result) return result;

  throw new Error(
    `Neither bucket "${VIDEOS_BUCKET}" nor "${FALLBACK_BUCKET}" is available.`
  );
}
