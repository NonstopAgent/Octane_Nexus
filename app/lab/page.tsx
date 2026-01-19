'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, Zap, Lock, Sparkles, Target, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { isLocalhost, getMockUser, hasMockSession } from '@/lib/mockAuth';
import {
  generateVideoIdeas,
  generatePlatformSpecificBlueprints,
  type PlatformSpecificBlueprints,
} from '@/lib/gemini';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Helper function to extract topic from content history
function extractTopicFromHistory(history: string): string {
  // Extract first few words from first line as topic
  const firstLine = history.split('\n')[0]?.trim() || history.trim();
  const words = firstLine.split(/\s+/).slice(0, 3).join(' ');
  return words.length > 30 ? words.substring(0, 27) + '...' : words;
}

// Helper function to extract vibe/tone from content history
function extractVibeFromHistory(history: string): string {
  // Simple heuristic: look for common vibe words or default to confident
  const lowerHistory = history.toLowerCase();
  if (lowerHistory.includes('playful') || lowerHistory.includes('fun')) return 'playful';
  if (lowerHistory.includes('calm') || lowerHistory.includes('peaceful')) return 'calm';
  if (lowerHistory.includes('bold') || lowerHistory.includes('daring')) return 'bold';
  if (lowerHistory.includes('honest') || lowerHistory.includes('real')) return 'authentic';
  return 'confident';
}

export default function LabPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [niche, setNiche] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blueprintOpen, setBlueprintOpen] = useState(false);
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const [activeIdea, setActiveIdea] = useState<string | null>(null);
  const [platformBlueprints, setPlatformBlueprints] = useState<PlatformSpecificBlueprints | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'tiktok' | 'instagram' | 'x' | null>(null);
  const [hasPurchasedPackage, setHasPurchasedPackage] = useState<boolean>(false);
  const [purchasedPackageType, setPurchasedPackageType] = useState<'sniper' | 'vault' | null>(null);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [bypassLoading, setBypassLoading] = useState<boolean>(false);
  const [blueprintCount, setBlueprintCount] = useState<number>(0);
  const [hasContentHistory, setHasContentHistory] = useState<boolean>(false);
  const [contentHistoryText, setContentHistoryText] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function fetchProfileData() {
      try {
        // Check for mock user on localhost first
        if (isLocalhost() && hasMockSession()) {
          const mockUser = getMockUser();
          if (mockUser?.has_purchased_package) {
            console.log('User Package Status (Mock):', mockUser.has_purchased_package, mockUser.purchased_package_type);
            setHasPurchasedPackage(true);
            setPurchasedPackageType(mockUser.purchased_package_type || 'vault');
            setCheckingAccess(false);
            if (!isMounted) return;
            return;
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!isMounted) return;
          setCheckingAccess(false);
          return;
        }

        // Fetch niche and package info
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('niche, has_purchased_package, purchased_package_type, founder_license')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (profileError) {
          console.error('Error loading profile for Lab.', profileError);
          setCheckingAccess(false);
          return;
        }

        if (profile?.niche) {
          setNiche(profile.niche);
        }

        // Check if user has purchased package (Authority Vault or legacy founder_license)
        const hasVaultAccess = profile?.purchased_package_type === 'vault' || profile?.founder_license;
        setHasPurchasedPackage(profile?.has_purchased_package || false);
        setPurchasedPackageType(profile?.purchased_package_type || (profile?.founder_license ? 'vault' : null));

        // Only vault users get unlimited blueprints
        if (!hasVaultAccess) {
          const { count } = await supabase
            .from('saved_blueprints')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          setBlueprintCount(count || 0);
        }

        setCheckingAccess(false);

        // Check for content history
        const { data: contentHistory } = await supabase
          .from('user_content_history')
          .select('content_text')
          .eq('user_id', user.id)
          .maybeSingle();

        if (isMounted && contentHistory?.content_text) {
          setHasContentHistory(true);
          setContentHistoryText(contentHistory.content_text);
        }
      } catch (err) {
        console.error('Unexpected error while loading profile for Lab.', err);
      }
    }

    fetchProfileData();

    // Check for success parameter from Stripe redirect
    if (searchParams?.get('success') === 'true') {
      // Refresh founder license status
      fetchProfileData();
    }

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  async function handleGenerateIdeas() {
    if (!niche.trim()) return;
    setError(null);
    setLoading(true);
    try {
      // Get user ID for brand voice training
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      const nextIdeas = await generateVideoIdeas({
        niche,
        userId: user?.id,
      });
      setIdeas(nextIdeas);
    } catch (err: any) {
      setError(
        err?.message ||
          "Couldn't generate ideas right now. Try again in a moment with a simple niche description."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveIdea(idea: string) {
    // Check Pro gate
    const hasVaultAccess = purchasedPackageType === 'vault';
    if (!hasVaultAccess && blueprintCount >= 3) {
      setBlueprintError(
        'You\'ve reached the free limit of 3 blueprints. Upgrade to the Authority Vault for unlimited access.'
      );
      return;
    }

    setActiveIdea(idea);
    setBlueprintOpen(true);
    setBlueprintLoading(true);
    setBlueprintError(null);
    setPlatformBlueprints(null);
    setSelectedPlatform(null);

    try {
      // Get user ID for brand voice training
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Unable to load Supabase user for blueprint save.', userError);
        // Still try to generate without user ID
      }

      // Generate platform-specific blueprints from Gemini
      const result = await generatePlatformSpecificBlueprints({
        idea,
        userId: user?.id,
      });
      setPlatformBlueprints(result);
      setSelectedPlatform('tiktok'); // Default to TikTok

      // Persist all three platform blueprints to Supabase for later retrieval
      if (user) {
        const { error: insertError } = await supabase
          .from('saved_blueprints')
          .insert({
            user_id: user.id,
            idea,
            blueprint: result, // Store all three platform blueprints
          });

        if (insertError) {
          console.error('Error saving blueprint to Supabase.', insertError);
        } else {
          // Update blueprint count for non-founders
          if (purchasedPackageType !== 'vault') {
            setBlueprintCount((prev) => prev + 1);
          }
        }
      }
    } catch (err: any) {
      setBlueprintError(
        err?.message ||
          'Could not generate platform-specific blueprints right now. Try again in a moment.'
      );
    } finally {
      setBlueprintLoading(false);
    }
  }

  async function handlePurchase(packageType: 'sniper' | 'vault') {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageType }),
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
      setBlueprintError(
        err?.message || 'Failed to start checkout. Please try again.'
      );
      setCheckoutLoading(false);
    }
  }

  if (checkingAccess) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-4 py-10 text-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm text-slate-300">Checking access...</p>
      </main>
    );
  }

  const hasVaultAccess = purchasedPackageType === 'vault';
  if (!hasPurchasedPackage) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 text-slate-50">
        <div className="relative min-h-[600px] rounded-3xl border-2 border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          {/* Blurred content behind paywall */}
          <div className="pointer-events-none select-none opacity-20 blur-sm">
            <header className="space-y-3">
              <p className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
                Octane Nexus Lab
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
                Generate video ideas that convert.
              </h1>
            </header>
          </div>

          {/* Paywall Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 rounded-3xl bg-slate-950/95 p-8 backdrop-blur-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-amber-500/40 bg-amber-500/10">
              <Lock className="h-10 w-10 text-amber-400" />
            </div>
            <div className="text-center space-y-4 max-w-lg">
              <h2 className="text-3xl font-semibold text-slate-50">
                Package Required
              </h2>
              <p className="text-base text-slate-300">
                The Algorithm Lab requires the Authority Vault package. Get unlimited, voice-matched content blueprints 
                for TikTok, Instagram, and X—30 days of custom scripts (90 total).
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 w-full max-w-2xl">
              {/* Identity Sniper Package */}
              <div className="flex flex-col gap-4 rounded-2xl border-2 border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                    <Target className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-50">$149</div>
                    <div className="text-xs text-slate-400">One-Time</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-50">Identity Sniper</h3>
                  <p className="text-xs text-slate-300">Cross-platform handles, 3 bios, niche analysis</p>
                </div>
                <button
                  onClick={() => handlePurchase('sniper')}
                  disabled={checkoutLoading}
                  className="mt-auto inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md transition-all hover:border-amber-400 hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Get Identity Package
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Authority Vault Package */}
              <div className="flex flex-col gap-4 rounded-2xl border-2 border-amber-500 bg-amber-500/10 p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-50">$299</div>
                    <div className="text-xs text-slate-400">One-Time</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-50">Authority Vault</h3>
                  <p className="text-xs text-slate-300">Everything + 30 days of blueprints (90 scripts)</p>
                </div>
                <button
                  onClick={() => handlePurchase('vault')}
                  disabled={checkoutLoading}
                  className="mt-auto inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md transition-all hover:border-amber-400 hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Get Authority Vault
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              {isLocalhost() && (
                <button
                  onClick={() => {
                    setBypassLoading(true);
                    setHasPurchasedPackage(true);
                    setPurchasedPackageType('vault');
                    setBypassLoading(false);
                    console.log('Bypassed auth on localhost - package access granted');
                  }}
                  disabled={bypassLoading}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-400 transition-all hover:border-emerald-500 hover:bg-emerald-500/20 disabled:cursor-not-allowed"
                >
                  {bypassLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Bypassing...
                    </>
                  ) : (
                    <>
                      🎭 Bypass Auth (Localhost)
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => router.push('/')}
                className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 text-slate-50">
      <header className="space-y-3">
        <p className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
          Octane Nexus Lab
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
          Daily Idea Hub
        </h1>
        <p className="max-w-2xl text-sm text-slate-300">
          We&apos;ll turn your niche into clear, filmable ideas. Come back each
          day to pull a few sparks and keep your page moving.
        </p>
      </header>

      <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl md:p-8">
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr),minmax(0,3fr)]">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                Your space (niche)
              </label>
              <input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. short-form fitness tips, cozy book talk, calm productivity"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateIdeas}
                disabled={!niche.trim() || loading}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/50"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Spinning up today&apos;s list...
                  </>
                ) : (
                  "Generate today's ideas"
                )}
              </button>
              <p className="text-xs text-slate-400">
                Ideas are yours to bend. Treat these as prompts, not commands.
              </p>
            </div>
            {error && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              How to use this hub
            </h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• Pull 1–3 ideas and schedule them into your week.</li>
              <li>• Add your own examples or stories so each idea feels human.</li>
              <li>
                • When a card works well, remake it with a new angle or format.
              </li>
            </ul>
          </div>
        </div>

        {ideas.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {ideas.map((idea, index) => {
              const hasVaultAccess = purchasedPackageType === 'vault';
              const isLimitReached = !hasVaultAccess && blueprintCount >= 3;
              return (
                <article
                  key={index}
                  className="flex flex-col justify-between gap-4 rounded-3xl border-2 border-slate-700 bg-slate-900/80 p-6 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">
                        #{index + 1}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">
                        Idea card
                      </span>
                    </div>
                    <p className="text-xl font-medium leading-relaxed text-slate-50">
                      {idea}
                    </p>
                  </div>
                  {isLimitReached ? (
                    <button
                      type="button"
                      onClick={() => handlePurchase('vault')}
                      disabled={checkoutLoading}
                      className="mt-2 inline-flex min-h-[60px] w-full items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-4 text-base font-semibold text-slate-950 shadow-lg transition-all hover:bg-amber-400 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                    >
                      {checkoutLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          Upgrade to Authority Vault
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      {!hasVaultAccess && (
                        <p className="mt-2 text-xs text-slate-400 text-center">
                          {3 - blueprintCount} blueprint{3 - blueprintCount !== 1 ? 's' : ''} remaining
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSaveIdea(idea)}
                        className="mt-2 inline-flex min-h-[56px] w-full items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-4 text-base font-semibold text-slate-950 shadow-md hover:bg-amber-400 hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                      >
                        Save this idea
                      </button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Video Blueprint modal */}
      {blueprintOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl border-2 border-amber-500 bg-slate-950 p-6 shadow-2xl md:p-8">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                    Video Blueprint
                  </p>
                  {hasContentHistory && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
                      <Sparkles className="h-3 w-3" />
                      Voice-Matched
                    </span>
                  )}
                </div>
                {activeIdea && (
                  <p className="mt-1 text-xs text-slate-400">
                    Based on: <span className="font-medium text-slate-200">{activeIdea}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setBlueprintOpen(false)}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-slate-700 px-4 text-xs font-semibold text-slate-200 hover:border-amber-400 hover:text-amber-300"
              >
                Close
              </button>
            </div>

            {blueprintLoading && (
              <div className="flex items-center justify-center py-6 text-sm text-slate-300">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-amber-400" />
                Shaping your script...
              </div>
            )}

            {!blueprintLoading && blueprintError && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {blueprintError}
              </p>
            )}

            {!blueprintLoading && platformBlueprints && (
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
                        {platformBlueprints[selectedPlatform].hook}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Middle beats
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-100 md:text-lg">
                        {platformBlueprints[selectedPlatform].meat.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Call to action
                      </p>
                      <p className="mt-2 text-lg font-medium text-slate-50 md:text-xl">
                        {platformBlueprints[selectedPlatform].cta}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                        Setup tip
                      </p>
                      <p className="mt-2 text-sm text-slate-200 md:text-base">
                        {platformBlueprints[selectedPlatform].setup_tip}
                      </p>
                    </div>

                    {/* Librarian's Strategy Note */}
                    {hasContentHistory && contentHistoryText && (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                          Librarian&apos;s Strategy Note
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-200">
                          Based on your successful post{contentHistoryText.split('\n').length > 1 ? 's' : ''} about{' '}
                          <span className="font-medium text-emerald-300">
                            {extractTopicFromHistory(contentHistoryText)}
                          </span>
                          , I&apos;ve adjusted this script to be more{' '}
                          <span className="font-medium text-emerald-300">
                            {extractVibeFromHistory(contentHistoryText)}
                          </span>{' '}
                          to match your proven style.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

