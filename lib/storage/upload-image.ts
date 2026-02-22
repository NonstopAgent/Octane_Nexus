/**
 * Server-only: Upload image buffer to Supabase Storage.
 * Uses service role. Prefers videos bucket, falls back to assets.
 */

import { createServiceRoleClient } from '@/lib/supabaseServer';

// Prefer buckets that allow image/png; content_uploads has it
const PRIMARY_BUCKET = 'content_uploads';
const FALLBACK_BUCKET = 'videos';
const LAST_FALLBACK_BUCKET = 'assets';

export type UploadImageResult = {
  publicUrl: string;
  objectPath: string;
};

export async function uploadImageBuffer(args: {
  buffer: Buffer;
  path: string;
  contentType?: string;
}): Promise<UploadImageResult> {
  const { buffer, path, contentType = 'image/png' } = args;
  const supabase = createServiceRoleClient();

  const tryBucket = async (bucket: string) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
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
    };
  };

  let result = await tryBucket(PRIMARY_BUCKET);
  if (result) return result;

  result = await tryBucket(FALLBACK_BUCKET);
  if (result) return result;

  result = await tryBucket(LAST_FALLBACK_BUCKET);
  if (result) return result;

  throw new Error(
    `No storage bucket available for images. Tried: ${PRIMARY_BUCKET}, ${FALLBACK_BUCKET}, ${LAST_FALLBACK_BUCKET}.`
  );
}
