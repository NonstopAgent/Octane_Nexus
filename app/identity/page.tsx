'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle2, Loader2, UserCircle2, Lock, Zap, ArrowRight, Target, Sparkles } from 'lucide-react';
import { generateBios, generateProfileImage, generateVisionBios, generateBrandBrief, type VisionBios, type BrandBrief } from '@/lib/gemini';
import { supabase } from '@/lib/supabaseClient';
import { isLocalhost, getMockUser, hasMockSession } from '@/lib/mockAuth';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type Platform = 'Instagram' | 'TikTok' | 'X' | 'YouTube';

type HandleCheck = {
  platform: Platform;
  handle: string;
  available: boolean;
  suggestions?: string[];
};

type Step = 0 | 1 | 2 | 3;

const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'X', 'YouTube'];

function simulateHandleAvailability(handle: string, primaryPlatform?: Platform): HandleCheck[] {
  return PLATFORMS.map((platform, index) => {
    // Light randomization so the UI feels alive but predictable.
    const normalized = handle.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Primary platform is more likely to be available
    const taken = primaryPlatform === platform 
      ? (normalized.length + index) % 3 === 0
      : (normalized.length + index) % 2 === 0;

    const suggestions = taken
      ? [
          `${normalized}_hq`,
          `real${normalized}`,
          `${normalized}${new Date().getFullYear() % 100}`,
        ]
      : undefined;

    return {
      platform,
      handle: `@${normalized || 'yourname'}`,
      available: !taken,
      suggestions,
    };
  });
}

export default function IdentityPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0); // Start at Step 0: Brand Brief
  const [hasPurchasedPackage, setHasPurchasedPackage] = useState<boolean>(false);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [forceUnlockLoading, setForceUnlockLoading] = useState<boolean>(false);
  
  // Check if we're in development mode
  const isDevelopment = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' || 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  // Step 0: Brand Brief state
  const [primaryPlatform, setPrimaryPlatform] = useState<Platform | null>(null);
  const [brandVision, setBrandVision] = useState<string>('');
  const [brandBrief, setBrandBrief] = useState<BrandBrief | null>(null);
  const [brandBriefLoading, setBrandBriefLoading] = useState(false);
  const [selectedNameOption, setSelectedNameOption] = useState<string>('');

  // Username Sniper state
  const [rawHandle, setRawHandle] = useState('');
  const [checkingHandles, setCheckingHandles] = useState(false);
  const [handleResults, setHandleResults] = useState<HandleCheck[] | null>(
    null
  );
  const [showIGWalkthrough, setShowIGWalkthrough] = useState(false);
  const [igWalkthroughStep, setIgWalkthroughStep] = useState<1 | 2 | 3>(1);

  // Bio Lab state (updated to use vision)
  const [vision, setVision] = useState('');
  const [niche, setNiche] = useState('');
  const [vibe, setVibe] = useState('');
  const [visionBios, setVisionBios] = useState<VisionBios | null>(null);
  const [selectedBioType, setSelectedBioType] = useState<'authority' | 'relatability' | 'mystery' | null>(null);
  const [biosLoading, setBiosLoading] = useState(false);
  const [biosError, setBiosError] = useState<string | null>(null);

  // Profile Pic Lab state
  const [refineImagePrompt, setRefineImagePrompt] = useState('');

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check for mock user on localhost first
        if (isLocalhost() && hasMockSession()) {
          const mockUser = getMockUser();
          if (mockUser?.has_purchased_package) {
            console.log('User Package Status (Mock):', mockUser.has_purchased_package);
            setHasPurchasedPackage(true);
            setCheckingAccess(false);
            return;
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setHasPurchasedPackage(false);
          setCheckingAccess(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('has_purchased_package')
          .eq('id', user.id)
          .maybeSingle();

        // Console log for debugging
        console.log('User Package Status:', profile?.has_purchased_package);

        setHasPurchasedPackage(profile?.has_purchased_package || false);
      } catch (err) {
        console.error('Error checking package access:', err);
        setHasPurchasedPackage(false);
      } finally {
        setCheckingAccess(false);
      }
    }

    checkAccess();
  }, []);

  async function handleBypassAuth() {
    // Localhost bypass - just set local state
    if (isLocalhost()) {
      setHasPurchasedPackage(true);
      console.log('Bypassed auth on localhost - package access granted');
      return;
    }

    // Production force unlock
    setForceUnlockLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Please sign in to unlock access.');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          has_purchased_package: true,
          purchased_package_type: 'vault',
          founder_license: true,
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Wait for database propagation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Refresh the page to show unlocked state
      window.location.reload();
    } catch (err: any) {
      console.error('Error force unlocking:', err);
      alert(err.message || 'Failed to force unlock. Please try again.');
    } finally {
      setForceUnlockLoading(false);
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
      if (stripe && data.sessionId) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (err: any) {
      console.error('Error starting checkout:', err);
      alert(err.message || 'Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  }

  async function updateProfileProgress(partial: {
    niche?: string;
    vibe?: string;
    onboarding_step?: number;
    linked_accounts?: {
      instagram?: string | null;
      tiktok?: string | null;
      x?: string | null;
    };
  }) {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Unable to load Supabase user for profile update.', userError);
        return;
      }

      const updateData: any = {
        id: user.id,
      };

      if (partial.niche !== undefined) {
        updateData.niche = partial.niche;
      }
      if (partial.vibe !== undefined) {
        updateData.vibe = partial.vibe;
      }
      if (partial.onboarding_step !== undefined) {
        updateData.onboarding_step = partial.onboarding_step;
      }
      if (partial.linked_accounts !== undefined) {
        updateData.linked_accounts = partial.linked_accounts;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(updateData);

      if (error) {
        console.error('Error updating profile progress in Supabase.', error);
      }
    } catch (err) {
      console.error('Unexpected error while updating profile progress.', err);
    }
  }

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return !!primaryPlatform && (!!niche.trim() || !!selectedNameOption);
    }
    if (step === 1) {
      return !!handleResults && !!rawHandle.trim();
    }
    if (step === 2) {
      return !!visionBios && !!selectedBioType && !!vision.trim();
    }
    return true;
  }, [step, primaryPlatform, niche, selectedNameOption, handleResults, rawHandle, visionBios, selectedBioType, vision]);

  async function handleAutoFillBrandBrief() {
    setBrandBriefLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      // Use brandVision if available, otherwise pull from user context
      const brief = await generateBrandBrief({ 
        userId: user?.id,
        vision: brandVision.trim() || undefined
      });
      setBrandBrief(brief);
      setNiche(brief.niche);
      setVibe(brief.vibe);
      if (brief.nameOptions.length > 0) {
        setSelectedNameOption(brief.nameOptions[0]);
        setRawHandle(brief.nameOptions[0]);
      }
    } catch (err: any) {
      console.error('Error generating brand brief:', err);
    } finally {
      setBrandBriefLoading(false);
    }
  }

  async function handleCheckHandles() {
    if (!rawHandle.trim()) return;
    setCheckingHandles(true);
    setHandleResults(null);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const results = simulateHandleAvailability(rawHandle, primaryPlatform || undefined);
    setHandleResults(results);
    
    // Show IG walkthrough if Instagram is selected and handle is available
    const igResult = results.find(r => r.platform === 'Instagram');
    if (igResult && igResult.available && primaryPlatform === 'Instagram') {
      setShowIGWalkthrough(true);
      setIgWalkthroughStep(1);
    }
    
    // Save linked accounts to profiles table
    const normalizedHandle = rawHandle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const linkedAccounts: {
      instagram?: string | null;
      tiktok?: string | null;
      x?: string | null;
      youtube?: string | null;
    } = {};
    
    // Map platform names to lowercase keys
    results.forEach((result) => {
      const handle = result.handle.replace('@', '');
      if (result.platform === 'Instagram') {
        linkedAccounts.instagram = handle;
      } else if (result.platform === 'TikTok') {
        linkedAccounts.tiktok = handle;
      } else if (result.platform === 'X') {
        linkedAccounts.x = handle;
      } else if (result.platform === 'YouTube') {
        linkedAccounts.youtube = handle;
      }
    });
    
    // Save to Supabase
    await updateProfileProgress({ linked_accounts: linkedAccounts });
    
    setCheckingHandles(false);
  }

  async function handleGenerateVisionBios() {
    if (!vision.trim()) return;
    setBiosError(null);
    setBiosLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      const output = await generateVisionBios({ 
        vision: vision.trim(), 
        userId: user?.id 
      });
      setVisionBios(output);
    } catch (err: any) {
      setBiosError(
        err?.message ||
          'Something felt off. Try again in a moment with a simple description.'
      );
    } finally {
      setBiosLoading(false);
    }
  }

  async function handleNext() {
    if (step === 3) return;
    if (!canGoNext) return;

    // Persist progress to Supabase as the user advances.
    if (step === 0) {
      await updateProfileProgress({ niche, vibe });
    } else if (step === 1) {
      // User is moving from Step 1 to Step 2.
      await updateProfileProgress({ onboarding_step: 2 });
    } else if (step === 2) {
      // User is moving from Step 2 to Step 3 – save niche, vibe, and mark step.
      await updateProfileProgress({
        niche,
        vibe,
        onboarding_step: 3,
      });
    }

    setStep((prev) => (prev === 3 ? prev : ((prev + 1) as Step)));
  }

  function handleBack() {
    if (step > 0) {
      setStep((prev) => (prev - 1) as Step);
    }
  }

  function handleSkip() {
    if (step < 3) {
      setStep((prev) => (prev + 1) as Step);
    }
  }

  async function handleSelectBio(index: number) {
    setSelectedBioIndex(index);

    // When a bio is selected in Step 2, persist niche, vibe, and onboarding_step.
    await updateProfileProgress({
      niche,
      vibe,
      onboarding_step: 2,
    });
  }

  async function handleSaveProgress() {
    // Mark onboarding as complete (step 3) and make sure latest niche/vibe are stored.
    await updateProfileProgress({
      niche,
      vibe,
      onboarding_step: 3,
    });
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
                Octane Nexus Identity Lab
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
                Shape the face of your online world.
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
                The Identity Sniper is included in all our packages. Secure your cross-platform handles, 
                get professional bios, and build your creator foundation—one time.
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
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      <span>Cross-platform handle securing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      <span>3 professional bios</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      <span>Custom niche analysis</span>
                    </li>
                  </ul>
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
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      <span className="font-semibold">Everything in Sniper</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      <span>30 days of blueprints (90 scripts)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      <span>Voice-matched content</span>
                    </li>
                  </ul>
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
                  onClick={handleBypassAuth}
                  disabled={forceUnlockLoading}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-400 transition-all hover:border-emerald-500 hover:bg-emerald-500/20 disabled:cursor-not-allowed"
                >
                  {forceUnlockLoading ? (
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
              {isDevelopment && !isLocalhost() && (
                <button
                  onClick={handleBypassAuth}
                  disabled={forceUnlockLoading}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-400 transition-all hover:border-emerald-500 hover:bg-emerald-500/20 disabled:cursor-not-allowed"
                >
                  {forceUnlockLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      🔓 Force Unlock (Dev Mode)
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
          Octane Nexus Identity Lab
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
          Shape the face of your online world.
        </h1>
        <p className="max-w-2xl text-sm text-slate-300">
          We&apos;ll walk through your name, story, and image—step by step. No
          fluff, no heavy tools. Just clear choices.
        </p>
      </header>

      {/* Step indicator */}
      <nav
        aria-label="Identity steps"
        className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-sm md:grid-cols-4"
      >
        <StepChip
          index={0}
          label="Brand Brief"
          description="Set your foundation."
          active={step === 0}
          complete={step > 0}
        />
        <StepChip
          index={1}
          label="Username Sniper"
          description="Find a clean handle that fits."
          active={step === 1}
          complete={step > 1}
        />
        <StepChip
          index={2}
          label="Bio Architect"
          description="Put words to your purpose."
          active={step === 2}
          complete={step > 2}
        />
        <StepChip
          index={3}
          label="Profile Pic Lab"
          description="Prepare your future image."
          active={step === 3}
          complete={false}
        />
      </nav>

      {/* Panel */}
      <section className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl md:p-8">
        {step === 0 && (
          <BrandBriefStep
            primaryPlatform={primaryPlatform}
            setPrimaryPlatform={setPrimaryPlatform}
            brandVision={brandVision}
            setBrandVision={setBrandVision}
            niche={niche}
            setNiche={setNiche}
            vibe={vibe}
            setVibe={setVibe}
            brandBrief={brandBrief}
            brandBriefLoading={brandBriefLoading}
            onAutoFill={handleAutoFillBrandBrief}
            selectedNameOption={selectedNameOption}
            setSelectedNameOption={setSelectedNameOption}
            setRawHandle={setRawHandle}
          />
        )}
        {step === 1 && (
          <UsernameSniper
            rawHandle={rawHandle}
            setRawHandle={setRawHandle}
            checking={checkingHandles}
            results={handleResults}
            onCheck={handleCheckHandles}
            primaryPlatform={primaryPlatform}
            showIGWalkthrough={showIGWalkthrough}
            setShowIGWalkthrough={setShowIGWalkthrough}
            igWalkthroughStep={igWalkthroughStep}
            setIgWalkthroughStep={setIgWalkthroughStep}
          />
        )}
        {step === 2 && (
          <BioArchitect
            vision={vision}
            setVision={setVision}
            visionBios={visionBios}
            loading={biosLoading}
            error={biosError}
            onGenerate={handleGenerateVisionBios}
            selectedBioType={selectedBioType}
            onSelectBio={setSelectedBioType}
          />
        )}
        {step === 3 && (
          <ProfilePicLab
            niche={niche}
            vibe={vibe}
            refinePrompt={refineImagePrompt}
            setRefinePrompt={setRefineImagePrompt}
            onSave={async (imageUrl: string) => {
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError || !user) {
                console.error('Unable to load Supabase user for profile image save.', userError);
                return;
              }

              const { error } = await supabase
                .from('profiles')
                .update({ profile_image_url: imageUrl })
                .eq('id', user.id);

              if (error) {
                console.error('Error saving profile image to Supabase.', error);
              }
            }}
          />
        )}
      </section>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-700 px-5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            Back
          </button>
          {step < 3 && (
            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-700 px-5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-900"
            >
              Skip
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {step < 3 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-500 px-8 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/50"
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={handleSaveProgress}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-500 px-8 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400"
            >
              Save my progress
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function StepChip(props: {
  index: number;
  label: string;
  description: string;
  active: boolean;
  complete: boolean;
}) {
  const { index, label, description, active, complete } = props;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
        active
          ? 'border-amber-500 bg-amber-500/10'
          : 'border-slate-800 bg-slate-900/80'
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
          complete
            ? 'bg-emerald-500 text-slate-950'
            : active
            ? 'bg-amber-500 text-slate-950'
            : 'bg-slate-800 text-slate-200'
        }`}
      >
        {complete ? <CheckCircle2 className="h-4 w-4" /> : index}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function BrandBriefStep(props: {
  primaryPlatform: Platform | null;
  setPrimaryPlatform: (platform: Platform | null) => void;
  brandVision: string;
  setBrandVision: (value: string) => void;
  niche: string;
  setNiche: (value: string) => void;
  vibe: string;
  setVibe: (value: string) => void;
  brandBrief: BrandBrief | null;
  brandBriefLoading: boolean;
  onAutoFill: () => void;
  selectedNameOption: string;
  setSelectedNameOption: (value: string) => void;
  setRawHandle: (value: string) => void;
}) {
  const {
    primaryPlatform,
    setPrimaryPlatform,
    brandVision,
    setBrandVision,
    niche,
    setNiche,
    vibe,
    setVibe,
    brandBrief,
    brandBriefLoading,
    onAutoFill,
    selectedNameOption,
    setSelectedNameOption,
    setRawHandle,
  } = props;

  const platformInstructions: Record<Platform, string> = {
    Instagram: 'Focus on visual storytelling and engagement. Use carousels and reels.',
    TikTok: 'Create short, punchy videos with trending sounds. Hook viewers in 3 seconds.',
    X: 'Share concise, valuable insights. Threads work well for longer thoughts.',
    YouTube: 'Build long-form authority content. Consistency and value are key.',
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">Brand Brief</h2>
        <p className="text-sm text-slate-300">
          Set your foundation. Choose your primary platform, and we&apos;ll tailor everything to that first.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Primary Platform
          </label>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {PLATFORMS.map((platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => setPrimaryPlatform(platform)}
                className={`rounded-xl border-2 p-3 text-sm font-semibold transition ${
                  primaryPlatform === platform
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600'
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
          {primaryPlatform && (
            <p className="text-xs text-slate-400 mt-2">
              {platformInstructions[primaryPlatform]}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">
            Brand Vision
          </label>
          <textarea
            value={brandVision}
            onChange={(e) => setBrandVision(e.target.value)}
            placeholder="Share your vision, goals, values, what you want to be known for... anything that helps us understand who you are and what you're building. Messy thoughts are welcome!"
            rows={6}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onAutoFill}
            disabled={brandBriefLoading}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-amber-500/50 bg-amber-500/10 px-4 text-sm font-semibold text-amber-400 transition-all hover:border-amber-500 hover:bg-amber-500/20 disabled:cursor-not-allowed"
          >
            {brandBriefLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                ✨ AI Auto-Fill
              </>
            )}
          </button>
          <p className="text-xs text-slate-400">
            Pulls from your Personal Context or previous inputs to suggest niche, vibe, and name options.
          </p>
        </div>

        {brandBrief && (
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Niche
                </label>
                <input
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. fitness for busy parents"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Vibe
                </label>
                <input
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  placeholder="e.g. confident, playful"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                Name Options (select one)
              </label>
              <div className="flex flex-wrap gap-2">
                {brandBrief.nameOptions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelectedNameOption(name);
                      setRawHandle(name);
                    }}
                    className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition ${
                      selectedNameOption === name
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsernameSniper(props: {
  rawHandle: string;
  setRawHandle: (value: string) => void;
  checking: boolean;
  results: HandleCheck[] | null;
  onCheck: () => void;
  primaryPlatform: Platform | null;
  showIGWalkthrough: boolean;
  setShowIGWalkthrough: (show: boolean) => void;
  igWalkthroughStep: 1 | 2 | 3;
  setIgWalkthroughStep: (step: 1 | 2 | 3) => void;
}) {
  const { rawHandle, setRawHandle, checking, results, onCheck, primaryPlatform, showIGWalkthrough, setShowIGWalkthrough, igWalkthroughStep, setIgWalkthroughStep } = props;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">
          Username Sniper
        </h2>
        <p className="text-sm text-slate-300">
          Start with a name that feels like you. We&apos;ll echo it across the
          main platforms and suggest small twists if it&apos;s taken.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-200">
          Your ideal handle
        </label>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={rawHandle}
            onChange={(e) => setRawHandle(e.target.value)}
            placeholder="@yourname"
            className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={onCheck}
            disabled={!rawHandle.trim() || checking}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/50"
          >
            {checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Listening across platforms...
              </>
            ) : (
              'Check handles'
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          We don&apos;t claim the names for you. This is just a gentle scout.
        </p>
      </div>

      {showIGWalkthrough && primaryPlatform === 'Instagram' && (
        <div className="mt-4 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-amber-300">Instagram Account Setup Guide</h3>
            <button
              type="button"
              onClick={() => setShowIGWalkthrough(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          </div>
          <div className="space-y-3">
            <div className={`p-3 rounded-xl ${igWalkthroughStep === 1 ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-slate-900/60'}`}>
              <p className="text-sm font-medium text-slate-200">Step 1: Legal Name</p>
              <p className="text-xs text-slate-400 mt-1">Enter your real name as it appears on your ID. This helps with verification.</p>
            </div>
            <div className={`p-3 rounded-xl ${igWalkthroughStep === 2 ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-slate-900/60'}`}>
              <p className="text-sm font-medium text-slate-200">Step 2: Birthday</p>
              <p className="text-xs text-slate-400 mt-1">Enter your date of birth. Must be 13+ to create an account.</p>
            </div>
            <div className={`p-3 rounded-xl ${igWalkthroughStep === 3 ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-slate-900/60'}`}>
              <p className="text-sm font-medium text-slate-200">Step 3: Handle Entry</p>
              <p className="text-xs text-slate-400 mt-1">Use the handle you checked: <span className="font-mono text-amber-300">{rawHandle}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIgWalkthroughStep(igWalkthroughStep > 1 ? (igWalkthroughStep - 1) as 1 | 2 | 3 : 1)}
              disabled={igWalkthroughStep === 1}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                if (igWalkthroughStep < 3) {
                  setIgWalkthroughStep((igWalkthroughStep + 1) as 1 | 2 | 3);
                } else {
                  setShowIGWalkthrough(false);
                }
              }}
              className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              {igWalkthroughStep < 3 ? 'Next' : 'Got it'}
            </button>
          </div>
        </div>
      )}

      {results && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {results.map((item) => (
            <div
              key={item.platform}
              className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">
                  {item.platform}
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                    item.available
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {item.available ? 'Feels open' : 'Feels taken'}
                </span>
              </div>
              <p className="text-sm text-slate-200">{item.handle}</p>
              {!item.available && item.suggestions && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">
                    Try one of these gentle shifts:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {item.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setRawHandle(suggestion)}
                        className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-slate-700 px-3 text-xs text-slate-200 hover:border-amber-400 hover:text-amber-300"
                      >
                        @{suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BioArchitect(props: {
  vision: string;
  setVision: (value: string) => void;
  visionBios: VisionBios | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  selectedBioType: 'authority' | 'relatability' | 'mystery' | null;
  onSelectBio: (type: 'authority' | 'relatability' | 'mystery') => void;
}) {
  const {
    vision,
    setVision,
    visionBios,
    loading,
    error,
    onGenerate,
    selectedBioType,
    onSelectBio,
  } = props;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">Bio Architect</h2>
        <p className="text-sm text-slate-300">
          Tell the Librarian your vision (messy thoughts welcome). We&apos;ll transform it into 3 high-detail bios: Authority, Relatability, and Mystery.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-200">
          Your Vision
        </label>
        <textarea
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          placeholder="Share your vision, goals, values, what you want to be known for... anything that helps us understand who you are and what you're building. Messy thoughts are welcome!"
          rows={6}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!vision.trim() || loading}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-amber-500/50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Architecting your bios...
            </>
          ) : (
            'Generate Bios'
          )}
        </button>
        <p className="text-xs text-slate-400">
          We&apos;ll create 3 distinct bio styles from your vision.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </p>
      )}

      {visionBios && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => onSelectBio('authority')}
            className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition ${
              selectedBioType === 'authority'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-800 bg-slate-950/60 hover:border-amber-400 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">
                A
              </span>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Authority
              </span>
            </div>
            <p className="text-sm text-slate-100">{visionBios.authority}</p>
            <p className="text-[11px] text-slate-500">
              Positions you as an expert with credentials and credibility.
            </p>
          </button>
          <button
            type="button"
            onClick={() => onSelectBio('relatability')}
            className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition ${
              selectedBioType === 'relatability'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-800 bg-slate-950/60 hover:border-amber-400 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">
                R
              </span>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Relatability
              </span>
            </div>
            <p className="text-sm text-slate-100">{visionBios.relatability}</p>
            <p className="text-[11px] text-slate-500">
              Makes you feel like a friend who gets it.
            </p>
          </button>
          <button
            type="button"
            onClick={() => onSelectBio('mystery')}
            className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition ${
              selectedBioType === 'mystery'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-800 bg-slate-950/60 hover:border-amber-400 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">
                M
              </span>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Mystery
              </span>
            </div>
            <p className="text-sm text-slate-100">{visionBios.mystery}</p>
            <p className="text-[11px] text-slate-500">
              Creates intrigue and curiosity without revealing everything.
            </p>
          </button>
        </div>
      )}
    </div>
  );
}

function ProfilePicLab(props: {
  niche: string;
  vibe: string;
  refinePrompt: string;
  setRefinePrompt: (value: string) => void;
  onSave: (imageUrl: string) => Promise<void>;
}) {
  const { niche, vibe, refinePrompt, setRefinePrompt, onSave } = props;
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleGenerate(useRefine = false) {
    if (!niche.trim() || !vibe.trim()) {
      setError('Please fill in your niche and vibe in Step 2 first.');
      return;
    }

    setGenerating(true);
    setError(null);
    if (!useRefine) {
      setImageUrl(null);
    }

    try {
      const result = await generateProfileImage({ 
        niche: niche.trim(), 
        vibe: vibe.trim(),
        refinePrompt: useRefine && refinePrompt.trim() ? refinePrompt.trim() : undefined
      });
      setImageUrl(result.imageUrl);
    } catch (err: any) {
      setError(
        err?.message ||
          'Could not generate an image right now. Try again in a moment.'
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!imageUrl) return;

    setSaving(true);
    try {
      await onSave(imageUrl);
    } catch (err: any) {
      setError('Could not save the image. Try again in a moment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-50">
          <UserCircle2 className="h-7 w-7 text-amber-400" />
          Profile Pic Lab
        </h2>
        <p className="text-sm text-slate-300">
          We&apos;ll generate an AI profile image that matches your niche and
          vibe. Generate, preview, and save it to your profile.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr),minmax(0,3fr)]">
        <div className="flex aspect-square items-center justify-center rounded-3xl border-2 border-slate-700 bg-slate-950/60 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Generated profile image"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-center">
              <UserCircle2 className="mx-auto h-16 w-16 text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-200">
                {generating ? 'Generating your image...' : 'Image canvas'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {generating
                  ? 'This may take a moment.'
                  : 'Click "Generate My Image" to create your profile picture.'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="text-sm font-semibold text-slate-100">
            Generate your image
          </h3>
          <p className="text-xs text-slate-300">
            Based on your niche ({niche || 'not set'}) and vibe ({vibe || 'not set'}), we&apos;ll create a professional profile picture that matches your brand.
          </p>

          {error && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !niche.trim() || !vibe.trim()}
              className="w-full inline-flex min-h-[56px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-base font-semibold text-slate-950 shadow-md hover:bg-amber-400 hover:border-amber-400 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate My Image'
              )}
            </button>

            {imageUrl && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-medium text-slate-300">
                  Edit/Refine Image
                </label>
                <textarea
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  placeholder="Describe how you'd like to refine the image (e.g., 'make it more professional', 'add warmer colors', 'more minimalist', 'make it more cinematic')"
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                />
                <button
                  type="button"
                  onClick={() => handleGenerate(true)}
                  disabled={generating || !refinePrompt.trim()}
                  className="w-full inline-flex min-h-[40px] items-center justify-center rounded-full border border-amber-500/50 bg-amber-500/10 px-4 text-sm font-medium text-amber-400 transition-all hover:border-amber-500 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    'Regenerate with Refinement'
                  )}
                </button>
              </div>
            )}

            {imageUrl && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full inline-flex min-h-[56px] items-center justify-center rounded-full border-2 border-amber-500 bg-transparent px-6 text-base font-semibold text-amber-500 shadow-md hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:text-amber-500/60"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save to Profile'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

