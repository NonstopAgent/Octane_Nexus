'use client';

import { useState, useEffect, DragEvent } from 'react';
import { Upload, Loader2, Image as ImageIcon, Video, Copy, Check } from 'lucide-react';
import { generatePostAssets, type PostAssets } from '@/lib/gemini';

type MediaType = 'image' | 'video' | null;

export default function PostLabPage() {
  const [brandContext, setBrandContext] = useState<string>('content creator');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [dragActive, setDragActive] = useState(false);

  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'x' | 'youtube'>('instagram');
  const [vibe, setVibe] = useState<string>('Funny');
  const [goal, setGoal] = useState<'comments' | 'sales' | 'reach'>('comments');

  const [assets, setAssets] = useState<PostAssets | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVision = localStorage.getItem('brand_vision');
      if (storedVision) {
        const words = storedVision.split(/\s+/).slice(0, 3).join(' ');
        setBrandContext(words || 'content creator');
      }
    }
  }, []);

  function resetCopyState() {
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function handleFileSelect(selected: File) {
    const maxBytes = 2 * 1024 * 1024 * 1024; // ~2GB
    if (selected.size > maxBytes) {
      setError('File is too large. Max size is 2GB.');
      return;
    }

    const type = selected.type.startsWith('video/')
      ? 'video'
      : selected.type.startsWith('image/')
      ? 'image'
      : null;
    if (!type) {
      setError('Please upload an image or video file.');
      return;
    }

    setError(null);
    setFile(selected);
    setMediaType(type);
    setAssets(null);

    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  async function handleGenerate() {
    if (!mediaType) {
      setError('Please upload an image or video first.');
      return;
    }
    setError(null);
    setGenerating(true);

    try {
      const result = await generatePostAssets(mediaType, vibe, platform, goal);
      setAssets(result);
    } catch (err: any) {
      console.error('Failed to generate post assets:', err);
      setError(err?.message || 'Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      resetCopyState();
    } catch {
      // ignore
    }
  }

  const platformLabel =
    platform === 'instagram'
      ? 'Instagram'
      : platform === 'tiktok'
      ? 'TikTok'
      : platform === 'x'
      ? 'X (Twitter)'
      : 'YouTube Shorts';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Post Lab</h1>
          <p className="text-sm text-slate-400 mt-1">
            The Viral Manufacturing Studio — turn raw media into platform-perfect posts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: Input Zone */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Input Zone
            </p>

            {/* Dropzone */}
            <div
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 cursor-pointer transition ${
                dragActive
                  ? 'border-amber-400 bg-slate-900/80'
                  : 'border-slate-700 bg-slate-900/60 hover:border-amber-500/80'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.getElementById('media-input') as HTMLInputElement | null;
                input?.click();
              }}
            >
              <input
                id="media-input"
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    Drop Image or Video (Max 1 Hour / 2GB)
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    We&apos;ll tailor captions, hashtags, and first comment to this asset.
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Brand context: <span className="text-slate-300">{brandContext}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Smart Preview */}
          {previewUrl && mediaType && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Smart Preview
              </p>
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/40">
                {mediaType === 'video' ? (
                  <video controls className="w-full rounded-lg shadow-lg">
                    <source src={previewUrl} />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className="w-full rounded-lg shadow-lg object-cover"
                  />
                )}
              </div>
            </div>
          )}

          {/* Strategy Controls */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Strategy Controls
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Platform */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="x">X (Twitter)</option>
                  <option value="youtube">YouTube Shorts</option>
                </select>
              </div>

              {/* Vibe */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Vibe</label>
                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option>Funny</option>
                  <option>Professional</option>
                  <option>Storytelling</option>
                  <option>Controversial</option>
                  <option>Educational</option>
                </select>
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Goal</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="comments">Get Comments</option>
                  <option value="sales">Drive Sales</option>
                  <option value="reach">Viral Reach</option>
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Content…
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  ✨ Generate Content
                </>
              )}
            </button>

            {error && (
              <p className="text-xs text-rose-400 mt-1">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT: Output Zone */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Output Zone
              </p>
              <h2 className="text-lg font-semibold text-slate-50 mt-1">
                {assets ? 'Viral Asset Stack' : 'Ready to Create'}
              </h2>
              <p className="text-xs text-slate-400">
                Platform: <span className="text-slate-200">{platformLabel}</span>
              </p>
            </div>
          </div>

          {!assets ? (
            <div className="flex h-full min-h-[260px] items-center justify-center text-center">
              <div className="space-y-2 max-w-sm">
                <p className="text-sm font-medium text-slate-100">
                  Drop a media file on the left and I&apos;ll manufacture hooks, hashtags, and a first comment for you.
                </p>
                <p className="text-xs text-slate-500">
                  The more precise your platform / vibe / goal, the sharper the outputs become.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Card 1: Smart Captions */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-slate-100">Smart Captions</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'The Hook', key: 'hookCaption', value: assets.hookCaption },
                    { label: 'The Story', key: 'storyCaption', value: assets.storyCaption },
                    { label: 'The Minimalist', key: 'minimalistCaption', value: assets.minimalistCaption },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                          {item.label}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.value, item.key)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-amber-500 hover:text-amber-300 transition"
                        >
                          {copiedKey === item.key ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-slate-100 whitespace-pre-line leading-relaxed">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Hashtag Stack */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-sky-400" />
                    <h3 className="text-sm font-semibold text-slate-100">Hashtag Stack</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(assets.hashtags.join(' '), 'hashtags')}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-amber-500 hover:text-amber-300 transition"
                  >
                    {copiedKey === 'hashtags' ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied All
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy All
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Optimized for {platformLabel} with your current goal in mind.
                </p>
                <p className="text-sm text-slate-100 leading-relaxed break-words">
                  {assets.hashtags.map((tag) => `${tag} `)}
                </p>
              </div>

              {/* Card 3: First Comment */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-slate-100">First Comment</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(assets.firstComment, 'firstComment')}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-amber-500 hover:text-amber-300 transition"
                  >
                    {copiedKey === 'firstComment' ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Drop this as your pinned first comment to drive replies.
                </p>
                <p className="text-sm text-slate-100 leading-relaxed">
                  {assets.firstComment}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

