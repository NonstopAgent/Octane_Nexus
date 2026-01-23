'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, Search, Filter, Hash, Sparkles } from 'lucide-react';
import { getTrendingHashtags, getTrendingByCategory, searchTrendingHashtags, type Platform, type TrendingHashtag } from '@/lib/trends';

const PLATFORMS: { value: Platform | 'all'; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X (Twitter)' },
];

const CATEGORIES = [
  'All Categories',
  'General',
  'Entertainment',
  'Lifestyle',
  'Professional',
  'Beauty',
  'Creative',
  'Visual',
  'Algorithm',
  'Content Format',
];

export default function TrendsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  const filteredHashtags = useMemo(() => {
    let filtered: TrendingHashtag[];

    if (searchQuery.trim()) {
      filtered = searchTrendingHashtags(searchQuery);
    } else if (selectedCategory !== 'All Categories') {
      filtered = getTrendingByCategory(selectedCategory, selectedPlatform === 'all' ? undefined : selectedPlatform);
    } else {
      filtered = getTrendingHashtags(selectedPlatform === 'all' ? undefined : selectedPlatform);
    }

    return filtered;
  }, [searchQuery, selectedPlatform, selectedCategory]);

  const getPlatformColor = (platform: Platform) => {
    switch (platform) {
      case 'tiktok':
        return 'bg-black text-white border-black';
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent';
      case 'x':
        return 'bg-black text-white border-black';
      default:
        return 'bg-slate-800 text-slate-200 border-slate-700';
    }
  };

  const getTrendScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 80) return 'text-amber-400';
    if (score >= 70) return 'text-slate-300';
    return 'text-slate-400';
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-10 text-slate-50">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Strategic Intelligence Hub
          </span>
        </div>
        <h1 className="text-4xl font-semibold leading-tight text-slate-50 md:text-5xl">
          Trending Lab
        </h1>
        <p className="max-w-2xl text-base text-slate-300 md:text-lg">
          Real-time trending hashtags across TikTok, Instagram, and X. Track velocity, discover patterns, 
          and identify high-opportunity content angles.
        </p>
      </header>

      {/* Filters */}
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hashtags, categories, or descriptions..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Platform Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:flex-shrink-0">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.value}
                onClick={() => setSelectedPlatform(platform.value)}
                className={`whitespace-nowrap rounded-full border-2 px-4 py-2 text-xs font-semibold transition-all ${
                  selectedPlatform === platform.value
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                }`}
              >
                {platform.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Filter className="h-4 w-4 self-center text-slate-400" />
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === category
                  ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                  : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Trending Hashtags Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-50">
            Trending Hashtags
          </h2>
          <span className="text-sm text-slate-400">
            {filteredHashtags.length} hashtag{filteredHashtags.length !== 1 ? 's' : ''} found
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredHashtags.map((hashtag, index) => (
            <div
              key={`${hashtag.platform}-${hashtag.tag}`}
              className="group relative flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg transition-all hover:border-amber-500/50 hover:bg-slate-900 hover:shadow-xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-amber-400" />
                  <span className="text-lg font-semibold text-slate-50">
                    {hashtag.tag}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold ${getTrendScoreColor(hashtag.trend_score)}`}
                >
                  {hashtag.trend_score}
                </span>
              </div>

              {/* Platform Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getPlatformColor(hashtag.platform)}`}
                >
                  {hashtag.platform === 'x' ? 'X' : hashtag.platform.charAt(0).toUpperCase() + hashtag.platform.slice(1)}
                </span>
                <span className="text-xs text-slate-400">
                  {hashtag.category}
                </span>
              </div>

              {/* Description */}
              {hashtag.description && (
                <p className="text-sm text-slate-300">
                  {hashtag.description}
                </p>
              )}

              {/* Trend Score Bar */}
              <div className="mt-auto pt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all"
                    style={{ width: `${hashtag.trend_score}%` }}
                  />
                </div>
              </div>

              {/* Rank Badge */}
              <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/80 text-xs font-bold text-slate-400">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>

        {filteredHashtags.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-12 text-center">
            <Sparkles className="h-12 w-12 text-slate-600" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-400">No hashtags found</h3>
              <p className="text-sm text-slate-500">
                Try adjusting your filters or search query to find trending hashtags.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
