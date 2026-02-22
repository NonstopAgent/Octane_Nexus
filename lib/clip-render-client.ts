/**
 * Client-only: trim video segments using ffmpeg.wasm.
 * Dynamic import from the Clip Studio page to avoid pulling WASM into initial bundle.
 */

export const MAX_CLIP_LENGTH_SEC = 180;

export type TrimResult = { blob: Blob; error?: never } | { blob?: never; error: string };

export type Trimmer = {
  trim: (sourceBlob: Blob, startSeconds: number, endSeconds: number) => Promise<TrimResult>;
  terminate: () => void;
};

function validateRange(start: number, end: number): { start: number; end: number } | { error: string } {
  const s = Number(start);
  const e = Number(end);
  if (!Number.isFinite(s) || s < 0) return { error: 'start must be >= 0' };
  if (!Number.isFinite(e) || e <= s) return { error: 'end must be > start' };
  if (e - s > MAX_CLIP_LENGTH_SEC) return { error: `Clip length must be <= ${MAX_CLIP_LENGTH_SEC}s` };
  return { start: s, end: e };
}

/**
 * Create a trimmer: load ffmpeg once, then call trim() for each range. Call terminate() when done.
 * Trim: try stream copy first; if it fails (e.g. keyframe), re-encode with libx264/aac.
 */
export async function createTrimmer(): Promise<Trimmer> {
  const [ffmpegMod, utilMod] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
  ]);
  const FFmpeg = (ffmpegMod as Record<string, unknown>).FFmpeg ?? (ffmpegMod as Record<string, unknown>).default;
  const { fetchFile } = utilMod as { fetchFile: (file: string | File | Blob) => Promise<Uint8Array> };
  if (!FFmpeg || typeof FFmpeg !== 'function') throw new Error('FFmpeg not found');

  const ffmpeg = new (FFmpeg as new () => {
    load: () => Promise<boolean>;
    writeFile: (path: string, data: Uint8Array) => Promise<void>;
    exec: (args: string[]) => Promise<number>;
    readFile: (path: string) => Promise<Uint8Array>;
    deleteFile: (path: string) => Promise<void>;
    terminate: () => void;
  })();
  await ffmpeg.load();

  return {
    async trim(sourceBlob: Blob, startSeconds: number, endSeconds: number): Promise<TrimResult> {
      const validated = validateRange(startSeconds, endSeconds);
      if ('error' in validated) return { error: validated.error };
      const { start, end } = validated;

      try {
        const inputData = await fetchFile(sourceBlob);
        await ffmpeg.writeFile('input.mp4', inputData);

        const copyArgs = [
          '-i', 'input.mp4',
          '-ss', String(start),
          '-to', String(end),
          '-c', 'copy',
          '-avoid_negative_ts', '1',
          'output.mp4',
        ];
        let code = await ffmpeg.exec(copyArgs);

        if (code !== 0) {
          try {
            await ffmpeg.deleteFile('output.mp4');
          } catch {}
          const encodeArgs = [
            '-i', 'input.mp4',
            '-ss', String(start),
            '-to', String(end),
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '23',
            '-c:a', 'aac',
            '-movflags', '+faststart',
            'output.mp4',
          ];
          code = await ffmpeg.exec(encodeArgs);
        }

        if (code !== 0) return { error: 'FFmpeg trim failed' };
        const data = await ffmpeg.readFile('output.mp4');
        const blob = new Blob([data as BlobPart], { type: 'video/mp4' });
        return { blob };
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Trim failed' };
      }
    },
    terminate: () => ffmpeg.terminate(),
  };
}
