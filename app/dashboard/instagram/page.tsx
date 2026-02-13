'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, Save, Calendar, List } from 'lucide-react';

type MediaType = 'image' | 'video' | 'carousel';
type Tone = 'bold' | 'casual' | 'story';
type Goal = 'growth' | 'engagement' | 'sales' | 'authority';

type QualityScore = {
  overall: number;
  breakdown: { caption: number; hashtags: number; media: number };
  suggestions: string[];
};

type InstagramPostRow = {
  id: string;
  media_type: string;
  media_urls: string[];
  caption: string | null;
  hashtags: string[] | null;
  quality_score: number | null;
  score_breakdown: { caption: number; hashtags: number; media: number } | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
};

export default function InstagramDashboardPage() {
  const [mediaUrls, setMediaUrls] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [tone, setTone] = useState<Tone>('casual');
  const [goal, setGoal] = useState<Goal>('growth');
  const [niche, setNiche] = useState('');
  const [keywords, setKeywords] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [useAIScore, setUseAIScore] = useState(false);
  const [score, setScore] = useState<QualityScore | null>(null);
  const [posts, setPosts] = useState<InstagramPostRow[]>([]);
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch('/api/instagram/posts');
      if (res.status === 401) {
        setPosts([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to load posts');
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleGenerateCaption() {
    if (!niche.trim()) {
      setError('Niche is required');
      return;
    }
    setLoadingCaption(true);
    setError(null);
    try {
      const res = await fetch('/api/instagram/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: mediaType,
          tone,
          goal,
          niche: niche.trim(),
          keywords: keywords.trim() ? keywords.trim().split(',').map((k) => k.trim()).filter(Boolean) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate caption');
      setCaption(data.caption ?? '');
      setHashtagsText(Array.isArray(data.hashtags) ? data.hashtags.join(' ') : '');
      setScore(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate caption');
    } finally {
      setLoadingCaption(false);
    }
  }

  async function handleScore() {
    setLoadingScore(true);
    setError(null);
    try {
      const hashtags = hashtagsText.trim() ? hashtagsText.trim().split(/\s+/).filter(Boolean) : [];
      const res = await fetch('/api/instagram/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          hashtags,
          media_type: mediaType,
          useAI: useAIScore,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to score');
      setScore(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to score');
    } finally {
      setLoadingScore(false);
    }
  }

  async function handleSaveDraft() {
    const urls = mediaUrls.trim() ? mediaUrls.trim().split('\n').map((u) => u.trim()).filter(Boolean) : [];
    if (urls.length === 0) {
      setError('Add at least one media URL');
      return;
    }
    setLoadingSave(true);
    setError(null);
    try {
      const hashtags = hashtagsText.trim() ? hashtagsText.trim().split(/\s+/).filter(Boolean) : [];
      const res = await fetch('/api/instagram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: mediaType,
          media_urls: urls,
          caption: caption || null,
          hashtags,
          quality_score: score?.overall ?? null,
          score_breakdown: score?.breakdown ?? null,
          status: 'draft',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      await fetchPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoadingSave(false);
    }
  }

  async function handleSchedule() {
    const urls = mediaUrls.trim() ? mediaUrls.trim().split('\n').map((u) => u.trim()).filter(Boolean) : [];
    if (urls.length === 0) {
      setError('Add at least one media URL');
      return;
    }
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    const scheduled_at = scheduledAt.toISOString();
    setLoadingSave(true);
    setError(null);
    try {
      const hashtags = hashtagsText.trim() ? hashtagsText.trim().split(/\s+/).filter(Boolean) : [];
      const res = await fetch('/api/instagram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: mediaType,
          media_urls: urls,
          caption: caption || null,
          hashtags,
          quality_score: score?.overall ?? null,
          score_breakdown: score?.breakdown ?? null,
          status: 'scheduled',
          scheduled_at,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule');
      await fetchPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule');
    } finally {
      setLoadingSave(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-amber-500">Instagram MVP</h1>
        <p className="text-slate-400 text-sm">Create drafts, score them, and schedule. Stage A: manual publish.</p>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Media URLs (one per line)</h2>
          <textarea
            value={mediaUrls}
            onChange={(e) => setMediaUrls(e.target.value)}
            placeholder="https://..."
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Controls</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Media type</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="bold">Bold</option>
                <option value="casual">Casual</option>
                <option value="story">Story</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Goal</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as Goal)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="growth">Growth</option>
                <option value="engagement">Engagement</option>
                <option value="sales">Sales</option>
                <option value="authority">Authority</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Niche</label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. fitness"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-slate-500 mb-1">Keywords (comma-separated)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="keyword1, keyword2"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleGenerateCaption}
              disabled={loadingCaption}
              className="inline-flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {loadingCaption ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Caption
            </button>
            <button
              onClick={handleScore}
              disabled={loadingScore}
              className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50"
            >
              {loadingScore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Score
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={useAIScore}
                onChange={(e) => setUseAIScore(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              Use AI critique
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Caption</h2>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Paste or edit caption..."
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
          <h2 className="text-sm font-medium text-slate-300 mt-3 mb-2">Hashtags</h2>
          <textarea
            value={hashtagsText}
            onChange={(e) => setHashtagsText(e.target.value)}
            placeholder="space or comma separated"
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={loadingSave}
              className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50"
            >
              {loadingSave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </button>
            <button
              onClick={handleSchedule}
              disabled={loadingSave}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-600 bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              Schedule
            </button>
          </div>
        </section>

        {score && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-medium text-slate-300 mb-3">Score</h2>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-3xl font-bold text-amber-500">{score.overall}</span>
              <div className="text-sm text-slate-400">
                Caption {score.breakdown.caption} · Hashtags {score.breakdown.hashtags} · Media {score.breakdown.media}
              </div>
            </div>
            {score.suggestions.length > 0 && (
              <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                {score.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <List className="h-4 w-4" />
            Recent (last 20)
          </h2>
          {loadingList ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : posts.length === 0 ? (
            <p className="text-slate-500 text-sm">No drafts or scheduled posts yet.</p>
          ) : (
            <ul className="space-y-2">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-300">{p.media_type}</span>
                  <span className="text-slate-500">{p.status}</span>
                  {p.quality_score != null && <span className="text-amber-500">{p.quality_score}</span>}
                  {p.scheduled_at && <span className="text-slate-400">{formatDate(p.scheduled_at)}</span>}
                  <span className="text-slate-500">{formatDate(p.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
