/**
 * Server-only: clip rendering with ffmpeg or stub for demo.
 * Do not import from client.
 */

import { createServiceRoleClient } from '@/lib/supabaseServer';
import { readFileSync, unlinkSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFile, execSync } from 'child_process';

const UPLOAD_BUCKET = 'clip-uploads';
const OUTPUT_BUCKET = 'clip-outputs';

export type ClipRange = { start: number; end: number };

export type RenderedClip = {
  start_seconds: number;
  end_seconds: number;
  title: string;
  caption: string;
  hashtags: string[];
  /** Storage path only (e.g. clips/{userId}/{jobId}/{clipId}.mp4), not a public URL. */
  output_path: string;
};

function stubCaption(index: number): { title: string; caption: string; hashtags: string[] } {
  return {
    title: `Clip ${index + 1}`,
    caption: `Clip ${index + 1} — created with Clip Studio.`,
    hashtags: ['#clip', '#content', '#creators'],
  };
}

/**
 * Check if ffmpeg is available.
 */
export function isFfmpegAvailable(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Download file from Supabase Storage to a temp path. Returns local path.
 */
async function downloadToTemp(storagePath: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).download(storagePath);
  if (error || !data) throw new Error(error?.message || 'Download failed');
  const dir = tmpdir();
  const name = `clip-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
  const filePath = join(dir, name);
  const buffer = Buffer.from(await data.arrayBuffer());
  writeFileSync(filePath, buffer);
  return filePath;
}

/**
 * Cut a segment with ffmpeg: -ss start -to end -c copy.
 */
function ffmpegCut(inputPath: string, outputPath: string, start: number, end: number): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'ffmpeg',
      ['-y', '-i', inputPath, '-ss', String(start), '-to', String(end), '-c', 'copy', outputPath],
      (err: Error | null) => (err ? reject(err) : resolve())
    );
  });
}

/**
 * Upload local file to clip-outputs bucket; return storage path (no public URL).
 */
async function uploadClipToStorage(
  localPath: string,
  userId: string,
  jobId: string,
  clipId: string
): Promise<string> {
  const supabase = createServiceRoleClient();
  const buffer = readFileSync(localPath);
  const storagePath = `clips/${userId}/${jobId}/${clipId}.mp4`;
  const { error } = await supabase.storage.from(OUTPUT_BUCKET).upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return storagePath;
}

/**
 * Process one range: download, cut, upload to clip-outputs, return clip record (storage path only).
 */
export async function processRange(
  storagePath: string,
  range: ClipRange,
  index: number,
  userId: string,
  jobId: string,
  clipId: string,
  useFfmpeg: boolean
): Promise<RenderedClip> {
  const meta = stubCaption(index);
  if (!useFfmpeg) {
    return {
      start_seconds: range.start,
      end_seconds: range.end,
      title: meta.title,
      caption: meta.caption,
      hashtags: meta.hashtags,
      output_path: 'pending',
    };
  }

  let inputPath: string | null = null;
  let outputPath: string | null = null;
  try {
    inputPath = await downloadToTemp(storagePath);
    outputPath = join(tmpdir(), `out-${clipId}.mp4`);
    await ffmpegCut(inputPath, outputPath, range.start, range.end);
    const path = await uploadClipToStorage(outputPath, userId, jobId, clipId);
    return {
      start_seconds: range.start,
      end_seconds: range.end,
      title: meta.title,
      caption: meta.caption,
      hashtags: meta.hashtags,
      output_path: path,
    };
  } finally {
    try {
      if (inputPath && existsSync(inputPath)) unlinkSync(inputPath);
      if (outputPath && existsSync(outputPath)) unlinkSync(outputPath);
    } catch {}
  }
}
