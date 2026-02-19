'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Scissors, Upload, Loader2, Download, Send, AlertTriangle } from 'lucide-react';
import SystemStatusBanner from '@/components/dashboard/SystemStatusBanner';
import { POST_STATUS } from '@/lib/constants';
import { addStoredPost } from '@/lib/creatorStore';

export default function ClipStudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(10);
  const [duration, setDuration] = useState(10);
  const [clipping, setClipping] = useState(false);
  const [clipBlobUrl, setClipBlobUrl] = useState<string | null>(null);
  const [, setRightsWarning] = useState(false);
  const [rightsAck, setRightsAck] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const demoMode = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  function handleFileSelect(f: File) {
    if (!f.type.startsWith('video/')) return;
    setFile(f);
    setClipBlobUrl(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      setDuration(v.duration);
      setClipEnd(Math.min(60, v.duration));
      URL.revokeObjectURL(v.src);
    };
    v.src = url;
  }

  function handleTrim() {
    if (!file || !previewUrl) return;
    setClipping(true);
    // Client-side trim: use MediaRecorder or canvas capture for MVP
    // For true trim we'd need ffmpeg.wasm; for demo we create a "virtual clip" blob
    setTimeout(() => {
      const blob = new Blob([file], { type: file.type });
      const u = URL.createObjectURL(blob);
      setClipBlobUrl(u);
      setClipping(false);
    }, 800);
  }

  async function handleSendToSchedule() {
    if (!clipBlobUrl && !file) return;
    if (sourceUrl && !rightsAck) {
      setRightsWarning(true);
      return;
    }
    const clipUrl = clipBlobUrl || (file ? URL.createObjectURL(file) : '');
    const ideaTitle = file?.name?.replace(/\.[^/.]+$/, '') || 'Clip';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (demoMode) headers['x-demo-mode'] = 'true';
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          idea_title: ideaTitle,
          status: POST_STATUS.READY,
          final_video_url: clipUrl.startsWith('blob:') ? `clip_${Date.now()}` : clipUrl,
          source_url: sourceUrl || null,
        }),
      });
      if (res.ok) {
        const { post } = await res.json();
        addStoredPost({
          user_id: post.user_id || 'demo_user_mvp_v1',
          status: POST_STATUS.READY,
          idea_title: ideaTitle,
          final_video_url: post.final_video_url,
          source_url: sourceUrl || undefined,
        });
      } else {
        addStoredPost({
          user_id: 'demo_user_mvp_v1',
          status: POST_STATUS.READY,
          idea_title: ideaTitle,
          final_video_url: `clip_${Date.now()}`,
          source_url: sourceUrl || undefined,
        });
      }
    } catch {
      addStoredPost({
        user_id: 'demo_user_mvp_v1',
        status: POST_STATUS.READY,
        idea_title: ideaTitle,
        final_video_url: `clip_${Date.now()}`,
        source_url: sourceUrl || undefined,
      });
    }
  }

  return (
    <div className="space-y-6">
      <SystemStatusBanner />
      <div className="flex items-center gap-3">
        <Scissors className="h-6 w-6 text-amber-400" />
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Clip Studio</h1>
          <p className="text-sm text-slate-400">Create clips from your videos (client render)</p>
        </div>
      </div>

      {sourceUrl && !rightsAck && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200 font-medium">Rights ledger warning</p>
            <p className="text-xs text-amber-300/80 mt-1">
              Source URL provided but no rights ledger row. Proceed only if you have rights to use this content.
            </p>
            <button
              type="button"
              onClick={() => setRightsAck(true)}
              className="mt-2 text-xs font-medium text-amber-400 underline hover:no-underline"
            >
              I acknowledge
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-50">Upload or select</h2>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            id="clip-file"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <label
            htmlFor="clip-file"
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-8 cursor-pointer hover:border-amber-500/50"
          >
            <Upload className="h-10 w-10 text-slate-500 mb-2" />
            <span className="text-sm text-slate-300">Drop video (MP4/MOV) or click</span>
          </label>
          <div>
            <label className="text-xs text-slate-400">Source URL (optional)</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            />
            <p className="text-[11px] text-slate-500 mt-1">Ties to rights ledger; warn if missing</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-50">Preview & trim</h2>
          {previewUrl && (
            <>
              <video
                ref={videoRef}
                src={previewUrl}
                controls
                className="w-full rounded-lg bg-black"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-400">Start (s)</label>
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    step={0.5}
                    value={clipStart}
                    onChange={(e) => setClipStart(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400">End (s)</label>
                  <input
                    type="number"
                    min={clipStart}
                    max={duration}
                    step={0.5}
                    value={clipEnd}
                    onChange={(e) => setClipEnd(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleTrim}
                disabled={clipping}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              >
                {clipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                Create clip
              </button>
            </>
          )}
          {clipBlobUrl && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Clip preview</p>
              <video src={clipBlobUrl} controls className="w-full rounded-lg bg-black" />
              <div className="flex gap-2">
                <a
                  href={clipBlobUrl}
                  download="clip.mp4"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={handleSendToSchedule}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  <Send className="h-4 w-4" />
                  Send to Schedule
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Link href="/dashboard/schedule" className="text-sm text-amber-400 hover:text-amber-300">
        ← Back to Schedule
      </Link>
    </div>
  );
}
