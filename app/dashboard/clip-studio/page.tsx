'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Scissors, Upload, Loader2, Send, AlertTriangle, CheckCircle, Film } from 'lucide-react';
import SystemStatusBanner from '@/components/dashboard/SystemStatusBanner';

type PostOption = { id: string; title: string; status: string };

export default function ClipStudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [rightsAck, setRightsAck] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(60);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostOption[]>([]);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [attached, setAttached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch('/api/production/posts', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : data.posts ?? [];
        setPosts(list.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          title: (p.title as string) || 'Untitled',
          status: (p.status as string) || '',
        })));
      })
      .catch(() => {});
  }, []);

  function handleFileSelect(f: File) {
    if (!f.type.startsWith('video/')) { setError('Please select a video file.'); return; }
    setFile(f);
    setUploadedPath(null);
    setSignedUrl(null);
    setAttached(false);
    setError(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { setDuration(v.duration); setTrimEnd(Math.min(60, v.duration)); URL.revokeObjectURL(v.src); };
    v.src = url;
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const initRes = await fetch('/api/uploads/init', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!initRes.ok) throw new Error('Failed to initialize upload');
      const initData = await initRes.json();
      const uploadUrl = initData.signedUrl || initData.url;
      const storagePath = initData.storagePath || initData.path;

      if (uploadUrl) {
        const putRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        if (!putRes.ok) throw new Error('Upload failed');
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', storagePath);
        const upRes = await fetch('/api/uploads/upload', { method: 'POST', credentials: 'include', body: formData });
        if (!upRes.ok) throw new Error('Upload failed');
      }

      await fetch('/api/uploads/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, filename: file.name, duration_seconds: Math.round(duration) }),
      });

      setUploadedPath(storagePath);

      const signRes = await fetch(`/api/media/signed-url?path=${encodeURIComponent(storagePath)}`, { credentials: 'include' });
      if (signRes.ok) {
        const signData = await signRes.json();
        setSignedUrl(signData.url || signData.signedUrl || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleAttach() {
    if (!selectedPostId || !uploadedPath) return;
    setAttaching(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        final_video_url: uploadedPath,
        trim_start_ms: Math.round(trimStart * 1000),
        trim_end_ms: Math.round(trimEnd * 1000),
      };
      if (sourceUrl) {
        body.source_url = sourceUrl;
        body.rights_attested = rightsAck;
      }
      const res = await fetch(`/api/posts/${selectedPostId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to attach');
      setAttached(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Attach failed');
    } finally {
      setAttaching(false);
    }
  }

  async function handleCreateAndAttach() {
    if (!uploadedPath) return;
    setAttaching(true);
    setError(null);
    try {
      const createRes = await fetch('/api/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file?.name?.replace(/\.[^/.]+$/, '') || 'Clip',
          status: 'ready',
          final_video_url: uploadedPath,
          source_url: sourceUrl || null,
          rights_attested: sourceUrl ? rightsAck : undefined,
          trim_start_ms: Math.round(trimStart * 1000),
          trim_end_ms: Math.round(trimEnd * 1000),
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create post');
      setAttached(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setAttaching(false);
    }
  }

  return (
    <div className="space-y-6">
      <SystemStatusBanner />
      <div className="flex items-center gap-3">
        <Scissors className="h-6 w-6 text-amber-400" />
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Clip Studio</h1>
          <p className="text-sm text-slate-400">Upload video, set trim points, and attach to a post</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-50">1. Upload Video</h2>
          <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" id="clip-file"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
          <label htmlFor="clip-file"
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/60 p-8 cursor-pointer hover:border-amber-500/50 transition">
            <Upload className="h-10 w-10 text-slate-500 mb-2" />
            <span className="text-sm text-slate-300">{file ? file.name : 'Drop video (MP4/MOV) or click'}</span>
          </label>

          {previewUrl && !signedUrl && (
            <video ref={videoRef} src={previewUrl} controls className="w-full rounded-lg bg-black max-h-64" />
          )}
          {signedUrl && (
            <video src={signedUrl} controls className="w-full rounded-lg bg-black max-h-64" />
          )}

          {file && !uploadedPath && (
            <button onClick={handleUpload} disabled={uploading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition">
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload to Storage</>}
            </button>
          )}
          {uploadedPath && (
            <div className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle className="h-4 w-4" /> Uploaded</div>
          )}

          <div>
            <label className="text-xs text-slate-400">Source URL (optional)</label>
            <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none" />
          </div>

          {sourceUrl && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">Source URL provided. Please confirm you have rights to use this content.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input type="checkbox" checked={rightsAck} onChange={(e) => setRightsAck(e.target.checked)}
                  className="rounded border-slate-600" />
                I have rights to use this content
              </label>
            </div>
          )}
        </div>

        {/* Right: Trim + Attach */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-50">2. Set Trim & Attach</h2>
          {duration > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Start (s)</label>
                <input type="number" min={0} max={duration} step={0.5} value={trimStart}
                  onChange={(e) => setTrimStart(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100" />
              </div>
              <div>
                <label className="text-xs text-slate-400">End (s)</label>
                <input type="number" min={trimStart} max={duration} step={0.5} value={trimEnd}
                  onChange={(e) => setTrimEnd(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100" />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Attach to existing post</label>
            <select value={selectedPostId} onChange={(e) => setSelectedPostId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none">
              <option value="">— Select a post —</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
              ))}
            </select>
          </div>

          {uploadedPath && selectedPostId && (
            <button onClick={handleAttach} disabled={attaching || (!!sourceUrl && !rightsAck)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition">
              {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              Attach to Post
            </button>
          )}

          {uploadedPath && !selectedPostId && (
            <button onClick={handleCreateAndAttach} disabled={attaching || (!!sourceUrl && !rightsAck)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 transition">
              {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Create New Post with This Video
            </button>
          )}

          {attached && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              Video attached! <Link href="/dashboard/production" className="underline hover:no-underline">View in Production</Link>
            </div>
          )}

          {!uploadedPath && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Film className="h-10 w-10 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">Upload a video first, then attach it to a post.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/production" className="text-sm text-amber-400 hover:text-amber-300">← Production Board</Link>
        <Link href="/dashboard/schedule" className="text-sm text-slate-400 hover:text-slate-300">Schedule →</Link>
      </div>
    </div>
  );
}
