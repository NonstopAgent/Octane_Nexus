'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Loader2, Zap, Lock, Sparkles, Target, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  generateVideoScript,
  type VideoScriptVariation,
} from '@/lib/gemini';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const VIBE_OPTIONS = [
  { value: 'educational', label: 'Educational' },
  { value: 'funny', label: 'Funny' },
  { value: 'controversial', label: 'Controversial' },
];

function LabContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [vibe, setVibe] = useState('educational');
  const [scripts, setScripts] = useState<VideoScriptVariation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPurchasedPackage, setHasPurchasedPackage] = useState<boolean>(false);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfileData() {
      try {
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
          .select('has_purchased_package')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (profileError) {
          console.error('Error loading profile for Lab.', profileError);
          setCheckingAccess(false);
          return;
        }

        setHasPurchasedPackage(profile?.has_purchased_package || false);
        setCheckingAccess(false);
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

  async function handleGenerateBlueprints() {
    if (!topic.trim()) return;
    setError(null);
    setLoading(true);
    setScripts([]);
    try {
      const result = await generateVideoScript(topic.trim(), audience.trim(), vibe);
      setScripts(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Couldn't generate scripts right now. Try again in a moment."
      );
    } finally {
      setLoading(false);
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
    } catch (err: unknown) {
      console.error('Error initiating checkout:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout. Please try again.');
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
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-10 text-slate-50">
      <header className="space-y-3">
        <p className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
          Algorithm Lab
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
          Generate Video Scripts
        </h1>
        <p className="max-w-2xl text-sm text-slate-300">
          Enter a topic, target audience, and vibe. Get 3 distinct script variations ready to film.
        </p>
      </header>

      {/* Split-Screen Layout */}
      <div className="grid min-h-[500px] gap-6 lg:grid-cols-[400px_1fr]">
        {/* Left: Input Form */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-4">Input</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">Topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How to do a pushup"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">Target Audience</label>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. fitness beginners, busy parents"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">Vibe</label>
              <select
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {VIBE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleGenerateBlueprints}
              disabled={!topic.trim() || loading}
              className="w-full inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-base font-semibold text-slate-950 shadow-md hover:bg-amber-400 hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Blueprints...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Generate Blueprints
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Output - Scrollable Scripts */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl overflow-hidden flex flex-col">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-4">Generated Scripts</h2>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
                <p className="text-sm text-slate-400">Creating your script variations...</p>
              </div>
            )}
            {!loading && scripts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="h-12 w-12 text-slate-600 mb-4" />
                <p className="text-sm text-slate-400">Enter a topic and click Generate Blueprints</p>
              </div>
            )}
            {!loading && scripts.length > 0 && scripts.map((script, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-50">{script.name}</h3>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-1">Hook</p>
                  <p className="text-base font-medium text-slate-100">{script.hook}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-2">Core Content (Meat)</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
                    {script.meat.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-1">Call to Action</p>
                  <p className="text-sm font-medium text-slate-100">{script.cta}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-1">Setup Tip</p>
                  <p className="text-sm text-slate-300 italic">{script.setup_tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LabPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950"><div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></main>}>
      <LabContent />
    </Suspense>
  );
}

