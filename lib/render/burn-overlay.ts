/**
 * Burn overlay PNG into video using FFmpeg.
 * Local/dev only - requires ffmpeg in PATH.
 * Install ffmpeg: https://ffmpeg.org/download.html
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type ffmpeg from 'fluent-ffmpeg';

export function isFfmpegRenderEnabled(): boolean {
  if (process.env.ENABLE_FFMPEG_RENDER === 'true') return true;
  if (process.env.NODE_ENV !== 'production') return true;
  return false;
}

/**
 * Burn overlay PNG into video. Returns output MP4 buffer.
 * Throws on download or ffmpeg failure.
 */
export async function burnOverlayIntoVideo(args: {
  videoUrl: string;
  overlayUrl: string;
}): Promise<Buffer> {
  const { videoUrl, overlayUrl } = args;
  const tmpDir = path.join(os.tmpdir(), `burn-overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tmpDir, { recursive: true });

  const videoPath = path.join(tmpDir, 'input.mp4');
  const overlayPath = path.join(tmpDir, 'overlay.png');
  const outputPath = path.join(tmpDir, 'output.mp4');

  try {
    const [videoRes, overlayRes] = await Promise.all([
      fetch(videoUrl),
      fetch(overlayUrl),
    ]);

    if (!videoRes.ok) {
      throw new Error(`Failed to fetch video: ${videoRes.status} ${videoRes.statusText}`);
    }
    if (!overlayRes.ok) {
      throw new Error(`Failed to fetch overlay: ${overlayRes.status} ${overlayRes.statusText}`);
    }

    const [videoBuffer, overlayBuffer] = await Promise.all([
      videoRes.arrayBuffer(),
      overlayRes.arrayBuffer(),
    ]);

    await Promise.all([
      fs.writeFile(videoPath, Buffer.from(videoBuffer)),
      fs.writeFile(overlayPath, Buffer.from(overlayBuffer)),
    ]);

    const ffmpeg = (await import('fluent-ffmpeg')).default as typeof import('fluent-ffmpeg');

    await new Promise<void>((resolve, reject) => {
      (ffmpeg as unknown as (input: string) => ffmpeg.FfmpegCommand)(videoPath)
        .input(overlayPath)
        .complexFilter('[1:v]format=rgba[ov];[0:v][ov]overlay=0:0:format=auto')
        .outputOptions([
          '-c:v libx264',
          '-profile:v baseline',
          '-level 3.0',
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          '-c:a aac',
          '-b:a 128k',
          '-shortest',
        ])
        .output(outputPath)
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .run();
    });

    const outBuffer = await fs.readFile(outputPath);
    return outBuffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
