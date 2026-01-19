'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { BookOpen, Loader2, Sparkles, FileText, CheckCircle2, Zap, Lock, Search, Users, TrendingUp, ExternalLink, Trophy, Star } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { generateLibrarianInsight } from '@/lib/gemini';
import type { PlatformSpecificBlueprints, VideoBlueprint } from '@/lib/gemini';
import { getTopCreators, searchCreators, type TopCreator, type Platform } from '@/lib/creators';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type SavedBlueprint = {
  id: string | number;
  idea: string;
  created_at: string | null;
  blueprint: PlatformSpecificBlueprints | VideoBlueprint | null;
};

export default function LibraryPage() {
  const [blueprints, setBlueprints] = useState<SavedBlueprint[]>([]);
  const [blueprintsLoading, setBlueprintsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState<boolean>(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [hasFounderLicense, setHasFounderLicense] = useState<boolean>(false);
  const [blueprintCount, setBlueprintCount] = useState<number>(0);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);

  const [brandVoiceText, setBrandVoiceText] = useState('');
  const [brandVoiceLoading, setBrandVoiceLoading] = useState<boolean>(false);
  const [brandVoiceSuccess, setBrandVoiceSuccess] = useState<boolean>(false);
  const [brandVoiceError, setBrandVoiceError] = useState<string | null>(null);
  const [hasContentHistory, setHasContentHistory] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<SavedBlueprint | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'instagram' | 'x' | null>(null);

  // Creator Vault state
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('');
  const [selectedCreatorPlatform, setSelectedCreatorPlatform] = useState<Platform | 'all'>('all');
  const [growthRateFilter, setGrowthRateFilter] = useState<'all' | 'rising' | 'established'>('all');

  // Viral marking state
  const [markingViral, setMarkingViral] = useState<string | null>(null);
  const [viralMarked, setViralMarked] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!isMounted) return;
          setError('Please sign in to see your library.');
          setBlueprintsLoading(false);
          return;
        }

        // Fetch user's full name, founder license, and content history
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, founder_license')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          if (profile?.full_name) {
            setFullName(profile.full_name);
          }

          // Check founder license
          if (profile?.founder_license) {
            setHasFounderLicense(true);
          }

          // Count blueprints for non-founders
          if (!profile?.founder_license) {
            const { count } = await supabase
              .from('saved_blueprints')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id);

            setBlueprintCount(count || 0);
          }
        }

        // Check if user has content history
        const { data: contentHistory } = await supabase
          .from('user_content_history')
          .select('id, content_text')
          .eq('user_id', user.id)
          .limit(1);

        if (isMounted) {
          setHasContentHistory((contentHistory?.length ?? 0) > 0);
          if (contentHistory && contentHistory.length > 0) {
            setBrandVoiceText(contentHistory[0].content_text || '');
          }
        }

        // Fetch all saved blueprints for this user
        const { data: rows, error: blueprintsError } = await supabase
          .from('saved_blueprints')
          .select('id, idea, created_at, blueprint')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (blueprintsError) {
          console.error('Error loading saved blueprints.', blueprintsError);
          setError('Could not load your content library. Try again in a moment.');
        } else if (rows) {
          setBlueprints(
            rows.map((row: any) => ({
              id: row.id,
              idea: row.idea,
              created_at: row.created_at ?? null,
              blueprint: row.blueprint ?? null,
            }))
          );
        }

        setBlueprintsLoading(false);
      } catch (err: any) {
        console.error('Unexpected error loading library data.', err);
        if (!isMounted) return;
        setError(
          err?.message || 'Something went wrong loading your content library.'
        );
        setBlueprintsLoading(false);
      }
    }

    loadData();

    // Check for success parameter from Stripe redirect
    if (searchParams?.get('success') === 'true') {
      // Refresh founder license status
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  async function handleGenerateInsight() {
    if (blueprints.length === 0) {
      setInsightError('You need at least one saved idea to generate an insight.');
      return;
    }

    setInsightLoading(true);
    setInsightError(null);
    setInsight(null);

    try {
      const ideas = blueprints.map((bp) => bp.idea);
      const result = await generateLibrarianInsight({
        savedIdeas: ideas,
        userName: fullName || undefined,
      });
      setInsight(result);
    } catch (err: any) {
      setInsightError(
        err?.message ||
          'Could not generate insight right now. Try again in a moment.'
      );
    } finally {
      setInsightLoading(false);
    }
  }

  async function handleMarkAsViral(blueprintId: string | number, status: 'viral' | 'success') {
    setMarkingViral(`${blueprintId}-${status}`);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Please sign in to mark blueprints.');
      }

      // Insert or update blueprint_performance
      const { error } = await supabase
        .from('blueprint_performance')
        .upsert(
          {
            blueprint_id: blueprintId,
            user_id: user.id,
            status: status,
            marked_at: new Date().toISOString(),
          },
          {
            onConflict: 'blueprint_id,user_id',
          }
        );

      if (error) {
        throw error;
      }

      // Update local state
      setViralMarked((prev) => new Set([...prev, blueprintId]));
      
      // Show success message
      setTimeout(() => {
        setMarkingViral(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error marking blueprint:', err);
      alert(err.message || 'Failed to mark blueprint. Please try again.');
      setMarkingViral(null);
    }
  }

  async function handleSaveBrandVoice() {
    if (!brandVoiceText.trim()) {
      setBrandVoiceError('Please paste at least one of your top-performing posts.');
      return;
    }

    setBrandVoiceLoading(true);
    setBrandVoiceError(null);
    setBrandVoiceSuccess(false);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Please sign in to save your brand voice.');
      }

      // Upsert content history (one entry per user for now)
      const { error: upsertError } = await supabase
        .from('user_content_history')
        .upsert(
          {
            user_id: user.id,
            content_text: brandVoiceText.trim(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (upsertError) {
        throw upsertError;
      }

      setBrandVoiceSuccess(true);
      setHasContentHistory(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setBrandVoiceSuccess(false);
      }, 3000);
    } catch (err: any) {
      setBrandVoiceError(
        err?.message ||
          'Could not save your brand voice. Please try again in a moment.'
      );
    } finally {
      setBrandVoiceLoading(false);
    }
  }

  async function handleUnlockFounderAccess() {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (redirectError) {
        throw redirectError;
      }
    } catch (err: any) {
      console.error('Error initiating checkout:', err);
      setInsightError(
        err?.message || 'Failed to start checkout. Please try again.'
      );
      setCheckoutLoading(false);
    }
  }

  function isPlatformSpecific(
    blueprint: PlatformSpecificBlueprints | VideoBlueprint | null
  ): blueprint is PlatformSpecificBlueprints {
    return (
      blueprint !== null &&
      typeof blueprint === 'object' &&
      'tiktok' in blueprint &&
      'instagram' in blueprint &&
      'x' in blueprint
    );
  }

  function openBlueprintModal(item: SavedBlueprint) {
    setActive(item);
    setModalOpen(true);
    
    // Determine if this is a platform-specific blueprint
    if (isPlatformSpecific(item.blueprint)) {
      setSelectedPlatform('tiktok');
    } else {
      setSelectedPlatform(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 text-slate-50">
      <header className="space-y-3">
        <p className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
          Content Library
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
          Your Complete Content Library
        </h1>
        <p className="max-w-2xl text-sm text-slate-300">
          Every script you&apos;ve ever created. Browse, analyze, and discover
          patterns in your content.
        </p>
      </header>

      {/* Librarian Insight Section */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Librarian Insight
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Let the Active Librarian analyze all your saved scripts and
                identify your strongest content pillars.
              </p>
            </div>

            {insight && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm leading-relaxed text-slate-50 md:text-base">
                  {insight}
                </p>
              </div>
            )}

            {insightError && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {insightError}
              </p>
            )}

            <button
              type="button"
              onClick={handleGenerateInsight}
              disabled={insightLoading || blueprints.length === 0}
              className="inline-flex min-h-[56px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-base font-semibold text-slate-950 shadow-md hover:bg-amber-400 hover:border-amber-400 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60"
            >
              {insightLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing your library...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Insight
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Creator Vault Section */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Creator Vault
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Explore top creators across niches. Study their strategies and discover patterns in high-performing content.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={creatorSearchQuery}
                  onChange={(e) => setCreatorSearchQuery(e.target.value)}
                  placeholder="Search creators by name, handle, or niche..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:flex-shrink-0">
                {[
                  { value: 'all', label: 'All Platforms' },
                  { value: 'tiktok', label: 'TikTok' },
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'x', label: 'X' },
                ].map((platform) => (
                  <button
                    key={platform.value}
                    onClick={() => setSelectedCreatorPlatform(platform.value as Platform | 'all')}
                    className={`whitespace-nowrap rounded-full border-2 px-4 py-2 text-xs font-semibold transition-all ${
                      selectedCreatorPlatform === platform.value
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Growth Rate Filter */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All Creators' },
                { value: 'rising', label: 'Rising Stars (15%+ growth)' },
                { value: 'established', label: 'Established Giants' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setGrowthRateFilter(filter.value as 'all' | 'rising' | 'established')}
                  className={`rounded-full border-2 px-4 py-2 text-xs font-semibold transition-all ${
                    growthRateFilter === filter.value
                      ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Creators Grid */}
            {(() => {
              let filteredCreators: TopCreator[];
              if (creatorSearchQuery.trim()) {
                filteredCreators = searchCreators(creatorSearchQuery);
              } else {
                filteredCreators = getTopCreators(selectedCreatorPlatform === 'all' ? undefined : selectedCreatorPlatform);
              }

              // Apply growth rate filter
              if (growthRateFilter === 'rising') {
                filteredCreators = filteredCreators.filter((creator) => (creator.growthRate || 0) >= 15);
              } else if (growthRateFilter === 'established') {
                filteredCreators = filteredCreators.filter((creator) => (creator.growthRate || 0) < 15);
              }

              return (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto">
                  {filteredCreators.slice(0, 50).map((creator) => (
                    <div
                      key={creator.id}
                      className="group relative flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-lg transition-all hover:border-amber-500/50 hover:bg-slate-900 hover:shadow-xl"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-slate-50">
                            {creator.name}
                          </h3>
                          <p className="text-sm text-amber-400">{creator.handle}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            creator.platform === 'tiktok'
                              ? 'bg-black text-white border-black'
                              : creator.platform === 'instagram'
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent'
                              : 'bg-black text-white border-black'
                          }`}
                        >
                          {creator.platform === 'x' ? 'X' : creator.platform.charAt(0).toUpperCase() + creator.platform.slice(1)}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {creator.followerCount >= 1000
                              ? `${(creator.followerCount / 1000).toFixed(1)}M`
                              : `${creator.followerCount}K`}{' '}
                            followers
                          </span>
                        </div>
                        {creator.growthRate && (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <TrendingUp className="h-3 w-3" />
                            <span>+{creator.growthRate}%</span>
                          </div>
                        )}
                      </div>

                      {/* Niche and Description */}
                      <div className="space-y-1">
                        <span className="inline-block rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                          {creator.niche}
                        </span>
                        {creator.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {creator.description}
                          </p>
                        )}
                      </div>

                      {/* View Strategy Button */}
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Implement strategy view modal
                          alert(`View ${creator.name}'s strategy (coming soon)`);
                        }}
                        className="mt-auto inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 px-4 text-xs font-semibold text-amber-400 transition-all hover:border-amber-500 hover:bg-amber-500/20"
                      >
                        View Strategy
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Brand Voice Training Section */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Brand Voice Training
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Paste your top 3 past posts here. The Librarian will study
                your successful voice and mimic it in every future script
                generation. This is your ultimate moat—AI that sounds like you.
              </p>
            </div>

            {brandVoiceSuccess && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-300">
                    Brand voice saved! The Librarian will now use your style in
                    all future scripts.
                  </p>
                </div>
              </div>
            )}

            {brandVoiceError && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {brandVoiceError}
              </p>
            )}

            <div className="space-y-3">
              <label
                htmlFor="brand-voice-text"
                className="block text-sm font-medium text-slate-200"
              >
                Your Top-Performing Posts
              </label>
              <textarea
                id="brand-voice-text"
                value={brandVoiceText}
                onChange={(e) => setBrandVoiceText(e.target.value)}
                placeholder="Paste your top 3 past posts here. The Librarian will study your successful voice and mimic it in every future script generation..."
                rows={8}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
              />
              <p className="text-xs text-slate-400">
                {hasContentHistory
                  ? 'Update your brand voice by pasting your new top 3 posts and saving again.'
                  : 'The Librarian will analyze your writing style, tone, and structure from your top 3 posts to create scripts that sound authentically like you.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveBrandVoice}
              disabled={brandVoiceLoading || !brandVoiceText.trim()}
              className="inline-flex min-h-[56px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-base font-semibold text-slate-950 shadow-md hover:bg-amber-400 hover:border-amber-400 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60"
            >
              {brandVoiceLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Training the Librarian...
                </>
              ) : hasContentHistory ? (
                'Update Brand Voice'
              ) : (
                'Train the Librarian'
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Content Library Grid */}
      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              All Saved Scripts
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Tap any script to view its full blueprint and platform variations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">
              {blueprintsLoading ? 'Loading…' : `${blueprints.length} scripts`}
            </span>
          </div>
        </div>

        {/* Pro Gate Notice */}
        {!hasFounderLicense && blueprintCount >= 3 && (
          <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <Lock className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    Free Limit Reached
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    You&apos;ve generated {blueprintCount} blueprints. Unlock
                    Founder License for unlimited multi-platform blueprints.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUnlockFounderAccess}
                  disabled={checkoutLoading}
                  className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:bg-amber-400 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      Unlock Founder Access - $49
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        )}

        {!blueprintsLoading && blueprints.length === 0 && !error && (
          <p className="text-sm text-slate-300">
            Your library is empty. Visit the Lab, generate ideas, and save
            blueprints to build your content library.
          </p>
        )}

        {blueprints.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {blueprints.map((item) => {
              const created =
                item.created_at && !Number.isNaN(Date.parse(item.created_at))
                  ? new Date(item.created_at)
                  : null;
              const formatted = created
                ? created.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Unknown date';

              const isPlatform = isPlatformSpecific(item.blueprint);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openBlueprintModal(item)}
                  className="flex min-h-[140px] flex-col justify-between gap-3 rounded-3xl border-2 border-slate-700 bg-slate-900/80 p-5 text-left shadow-md hover:border-amber-500 hover:bg-slate-900 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        {isPlatform ? 'Multi-Platform Script' : 'Video Script'}
                      </p>
                      {isPlatform && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          3 Platforms
                        </span>
                      )}
                    </div>
                    <p className="text-base font-medium leading-relaxed text-slate-50 line-clamp-3">
                      {item.idea}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">Saved on {formatted}</p>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsViral(item.id, 'success');
                        }}
                        disabled={markingViral !== null || viralMarked.has(item.id)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                          viralMarked.has(item.id)
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-amber-500 hover:text-amber-400'
                        } disabled:cursor-not-allowed`}
                        title="Mark as Success"
                      >
                        {markingViral === `${item.id}-success` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Star className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsViral(item.id, 'viral');
                        }}
                        disabled={markingViral !== null || viralMarked.has(item.id)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                          viralMarked.has(item.id)
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-amber-500 hover:text-amber-400'
                        } disabled:cursor-not-allowed`}
                        title="Mark as Viral"
                      >
                        {markingViral === `${item.id}-viral` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trophy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Blueprint Modal */}
      {modalOpen && active && active.blueprint && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-amber-500 bg-slate-950 p-6 shadow-2xl md:p-8">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                  {isPlatformSpecific(active.blueprint)
                    ? 'Multi-Platform Blueprint'
                    : 'Video Blueprint'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Based on:{' '}
                  <span className="font-medium text-slate-200">
                    {active.idea}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:border-amber-400 hover:text-amber-300"
              >
                Close
              </button>
            </div>

            {isPlatformSpecific(active.blueprint) ? (
              <div className="space-y-6">
                {/* Platform Selector */}
                <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('tiktok')}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedPlatform === 'tiktok'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-transparent text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    TikTok
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('instagram')}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedPlatform === 'instagram'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-transparent text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform('x')}
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedPlatform === 'x'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-transparent text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    X
                  </button>
                </div>

                {selectedPlatform && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        {selectedPlatform === 'tiktok'
                          ? 'TikTok: Focus on Visual Hooks'
                          : selectedPlatform === 'instagram'
                          ? 'Instagram: Focus on Engagement'
                          : 'X: Focus on Viral Text'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Hook
                      </p>
                      <p className="mt-2 text-2xl font-semibold leading-snug text-slate-50 md:text-3xl">
                        {active.blueprint[selectedPlatform].hook}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Middle beats
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-100 md:text-lg">
                        {active.blueprint[selectedPlatform].meat.map(
                          (point, idx) => (
                            <li key={idx}>{point}</li>
                          )
                        )}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Call to action
                      </p>
                      <p className="mt-2 text-lg font-medium text-slate-50 md:text-xl">
                        {active.blueprint[selectedPlatform].cta}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Setup tip
                      </p>
                      <p className="mt-2 text-sm text-slate-200 md:text-base">
                        {active.blueprint[selectedPlatform].setup_tip}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Hook
                  </p>
                  <p className="mt-2 text-2xl font-semibold leading-snug text-slate-50 md:text-3xl">
                    {active.blueprint.hook}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Middle beats
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-100 md:text-lg">
                    {active.blueprint.meat.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Call to action
                  </p>
                  <p className="mt-2 text-lg font-medium text-slate-50 md:text-xl">
                    {active.blueprint.cta}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Setup tip
                  </p>
                  <p className="mt-2 text-sm text-slate-200 md:text-base">
                    {active.blueprint.setup_tip}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
