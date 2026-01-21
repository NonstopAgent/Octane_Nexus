'use client';

import { useState, useRef, DragEvent } from 'react';
import { Upload, X, Copy, Check, Loader2 } from 'lucide-react';
import { generateSocialCaption, type CaptionResult } from '@/lib/gemini';

type PostOptimizerProps = {
  niche?: string;
};

export default function PostOptimizer({ niche }: PostOptimizerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionResult | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImageBase64(base64String);
      setImage(URL.createObjectURL(file));
      handleGenerateCaption(base64String);
    };
    reader.readAsDataURL(file);
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }

  async function handleGenerateCaption(base64: string) {
    setGenerating(true);
    setCaptions(null);

    try {
      const context = niche ? `Content for ${niche} niche` : 'Social media post';
      const result = await generateSocialCaption({
        imageBase64: base64,
        context,
        platform: 'instagram',
        tone: 'engaging and authentic'
      });
      setCaptions(result);
    } catch (error) {
      console.error('Failed to generate caption:', error);
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy(text: string, type: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function handleRemoveImage() {
    setImage(null);
    setImageBase64(null);
    setCaptions(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-50">Post Lab</h2>
        <span className="text-xs text-slate-500">Generate captions from images</span>
      </div>

      {/* Drag & Drop Zone */}
      {!image ? (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition ${
            dragActive
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-700 bg-slate-900 hover:border-amber-500/50 cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <Upload className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-200 mb-1">Drop image here or click to upload</p>
          <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
            <img
              src={image}
              alt="Upload preview"
              className="w-full max-h-64 object-contain"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/80 text-white hover:bg-black transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Generating State */}
          {generating && (
            <div className="flex items-center justify-center gap-3 py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Generating captions...</span>
            </div>
          )}

          {/* Generated Content */}
          {captions && !generating && (
            <div className="space-y-4">
              {/* Captions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-50">3 Caption Options</h3>
                </div>
                <div className="space-y-2">
                  {captions.captions.map((caption, index) => (
                    <div
                      key={index}
                      className="relative rounded-lg border border-slate-800 bg-slate-900/50 p-4 group"
                    >
                      <p className="text-sm text-slate-200 leading-relaxed pr-10">{caption}</p>
                      <button
                        type="button"
                        onClick={() => handleCopy(caption, `caption-${index}`)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-400 transition opacity-0 group-hover:opacity-100"
                      >
                        {copied === `caption-${index}` ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hashtags */}
              {captions.hashtags && captions.hashtags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-50">Hashtags</h3>
                    <button
                      type="button"
                      onClick={() => handleCopy(captions.hashtags.join(' '), 'hashtags')}
                      className="text-xs text-amber-400 hover:text-amber-300 transition inline-flex items-center gap-1"
                    >
                      {copied === 'hashtags' ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy All
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {captions.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 rounded-full bg-slate-800 text-xs text-slate-300 border border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategy Note & First Comment */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-50">First Comment Suggestion</h3>
                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-sm text-slate-200 leading-relaxed mb-2">
                    "{captions.captions[0]}"
                  </p>
                  <p className="text-xs text-slate-400 italic">{captions.strategyNote}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
