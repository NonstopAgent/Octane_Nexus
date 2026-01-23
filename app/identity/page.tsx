'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { CheckCircle2, Loader2, Lock, Zap, ArrowRight, Target, Sparkles, UserCircle, Activity, Cpu, TrendingUp, Globe, Anchor, Shield, Hexagon } from 'lucide-react';
import { generateVisionBios, generateBrandBrief, generateVisionHandles, generateDescriptionOptions, generateLogoConcepts, type VisionBios, type LogoConcept } from '@/lib/gemini';
import { generateBrandAsset } from '@/lib/image-gen';
import { supabase } from '@/lib/supabaseClient';
import { isLocalhost, getMockUser, hasMockSession } from '@/lib/mockAuth';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ==================== TYPES ====================
type Platform = 'Instagram' | 'TikTok' | 'X' | 'YouTube';
type StepName = 'Platform' | 'Purpose' | 'Setup Guide' | 'Handle Sniper' | 'Bio Architect' | 'Channel Description' | 'Pro Bio' | 'Channel Banner' | 'Header Image' | 'Brand Identity';
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Index-based step tracking

type HandleCheck = {
  platform: Platform;
  handle: string;
  available: boolean;
  suggestions?: string[];
};

const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'X', 'YouTube'];

// ==================== PLATFORM-SPECIFIC FLOWS ====================
type PlatformFlow = {
  [key in Platform]: StepName[];
};

const PLATFORM_FLOWS: PlatformFlow = {
  Instagram: ['Platform', 'Purpose', 'Setup Guide', 'Handle Sniper', 'Bio Architect', 'Brand Identity'],
  TikTok: ['Platform', 'Purpose', 'Setup Guide', 'Handle Sniper', 'Bio Architect', 'Brand Identity'],
  X: ['Platform', 'Purpose', 'Setup Guide', 'Handle Sniper', 'Pro Bio', 'Header Image', 'Brand Identity'],
  YouTube: ['Platform', 'Purpose', 'Setup Guide', 'Handle Sniper', 'Channel Description', 'Channel Banner', 'Brand Identity'],
};

// ==================== HELPER FUNCTIONS ====================
function simulateHandleAvailability(handle: string, primaryPlatform?: Platform): HandleCheck[] {
  return PLATFORMS.map((platform, index) => {
    const normalized = handle.toLowerCase().replace(/[^a-z0-9]/g, '');
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

// ==================== MAIN COMPONENT ====================
export default function IdentityPage() {
  const router = useRouter();
  
  // ==================== ACCESS CONTROL ====================
  const [hasPurchasedPackage, setHasPurchasedPackage] = useState<boolean>(false);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [forceUnlockLoading, setForceUnlockLoading] = useState<boolean>(false);
  
  const isDevelopment = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' || 
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  // ==================== SHARED STATE (Across All Steps) ====================
  const [step, setStep] = useState<Step>(0);
  const [primaryPlatform, setPrimaryPlatform] = useState<Platform | null>(null);
  const [steps, setSteps] = useState<StepName[]>(PLATFORM_FLOWS.Instagram); // Dynamic step flow
  const [vision, setVision] = useState<string>(''); // Brand Vision from Step 1
  const [niche, setNiche] = useState<string>('');
  const [vibe, setVibe] = useState<string>('');
  const [selectedHandle, setSelectedHandle] = useState<string>(''); // Selected handle from Step 3
  const [selectedBioType, setSelectedBioType] = useState<'authority' | 'relatability' | 'mystery' | null>(null);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null); // For Step 2: "I already have an account"

  // ==================== STEP-SPECIFIC STATE ====================
  // Step 2: Setup Guide
  const [setupGuideStep, setSetupGuideStep] = useState<1 | 2 | 3>(1);

  // Step 3: Handle Sniper
  const [rawHandle, setRawHandle] = useState('');
  const [checkingHandles, setCheckingHandles] = useState(false);
  const [handleResults, setHandleResults] = useState<HandleCheck[] | null>(null);
  const [suggestedHandles, setSuggestedHandles] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Step 4: Bio Architect
  const [visionBios, setVisionBios] = useState<VisionBios | null>(null);
  const [biosLoading, setBiosLoading] = useState(false);
  const [biosError, setBiosError] = useState<string | null>(null);
  const [editableVision, setEditableVision] = useState<string>('');
  const [isEditingVision, setIsEditingVision] = useState(false);

  // Step 5: Profile Pic Lab
  const [refineImagePrompt, setRefineImagePrompt] = useState('');
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // ==================== ACCESS CHECK & LOAD VISION ====================
  useEffect(() => {
    async function checkAccessAndLoadVision() {
      try {
        if (isLocalhost() && hasMockSession()) {
          const mockUser = getMockUser();
          if (mockUser?.has_purchased_package) {
            setHasPurchasedPackage(true);
            setCheckingAccess(false);
            return;
          }
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
          setHasPurchasedPackage(false);
          setCheckingAccess(false);
        return;
      }

        const { data: profile } = await supabase
        .from('profiles')
          .select('has_purchased_package, brand_vision, niche, vibe')
          .eq('id', user.id)
          .maybeSingle();

        setHasPurchasedPackage(profile?.has_purchased_package || false);
        
        // Load vision from profile if it exists
        if (profile?.brand_vision) {
          setVision(profile.brand_vision);
        }
        if (profile?.niche) {
          setNiche(profile.niche);
        }
        if (profile?.vibe) {
          setVibe(profile.vibe);
      }
    } catch (err) {
        console.error('Error checking package access:', err);
        setHasPurchasedPackage(false);
      } finally {
        setCheckingAccess(false);
    }
  }

    checkAccessAndLoadVision();
  }, []);

  // ==================== NAVIGATION HANDLERS ====================
  const currentStepName = steps[step];

  const canGoNext = useMemo(() => {
    if (step === 0) return !!primaryPlatform; // Step 0: Just need platform selected (auto-advances)
    if (step === 1) return !!vision.trim(); // Step 1: Purpose - Need vision entered
    if (step === 2) return hasAccount !== null; // Step 2: Setup Guide - Need to answer if they have account
    if (step === 3) return !!handleResults && !!selectedHandle.trim(); // Step 3: Handle Sniper
    if (currentStepName === 'Bio Architect') {
      return !!visionBios && !!selectedBioType && !!vision.trim(); // Bio steps - need bios generated
    }
    if (currentStepName === 'Channel Description') {
      // YouTube channel description - check if we have a selected description (using vision as placeholder)
      return !!vision.trim(); // For now, just check vision exists (will be updated when selection is saved)
    }
    if (currentStepName === 'Pro Bio') {
      // X Pro Bio - check if we have a selected description (using vision as placeholder)
      return !!vision.trim(); // For now, just check vision exists (will be updated when selection is saved)
    }
    return true; // Channel Banner, Header Image, Brand Identity - Always enabled
  }, [step, primaryPlatform, vision, hasAccount, handleResults, selectedHandle, visionBios, selectedBioType, currentStepName]);

  async function handleNext() {
    if (step >= steps.length - 1 || !canGoNext) return;
    
    // Save vision globally when moving from Purpose step
    if (step === 1 && vision.trim()) {
      await updateProfileProgress({ brand_vision: vision.trim() });
    }
    
    setStep((prev) => (prev + 1) as Step);
    await updateProfileProgress();
    
    // Auto-generate bios when entering Bio Architect or Pro Bio steps
    const nextStepName = steps[step + 1];
    if (step === 3 && (nextStepName === 'Bio Architect' || nextStepName === 'Pro Bio') && vision.trim() && !visionBios) {
      handleGenerateVisionBios();
    }
  }
  
    // Auto-generate bios when entering Bio Architect or Pro Bio steps - runs immediately on mount
  useEffect(() => {
    if (currentStepName === 'Bio Architect' || currentStepName === 'Pro Bio') {
      // Set editable vision to current vision on mount
      if (editableVision === '' && vision.trim()) {
        setEditableVision(vision.trim());
      }
      // Generate bios if they don't exist and vision exists
      if (vision.trim() && !visionBios && !biosLoading) {
        handleGenerateVisionBios();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, vision, currentStepName]);

  // Auto-generate handle suggestions when entering Handle Sniper step
  useEffect(() => {
    if (currentStepName === 'Handle Sniper' && vision.trim() && suggestedHandles.length === 0 && !loadingSuggestions) {
      handleGenerateHandleSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, currentStepName]);

  // Auto-advance from Setup Guide to Handle Sniper if user already has account
  useEffect(() => {
    if (currentStepName === 'Setup Guide' && hasAccount === true) {
      const timer = setTimeout(() => {
        setStep(3);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, hasAccount, currentStepName]);

  function handleBack() {
    if (step > 0) {
      setStep((prev) => (prev - 1) as Step);
    }
  }

  function handleSkip() {
    if (step < 5) {
      setStep((prev) => (prev + 1) as Step);
    }
  }

  // Handle platform selection (Step 0) - auto-advance to Step 1
  function handlePlatformSelect(platform: Platform) {
    setPrimaryPlatform(platform);
    // Update steps flow based on selected platform
    setSteps(PLATFORM_FLOWS[platform]);
    setStep(1); // Immediately advance to Step 1
  }

  // ==================== STEP HANDLERS ====================

  async function handleCheckHandles(handleOverride?: string) {
    const handleToCheck = handleOverride || rawHandle.trim();
    if (!handleToCheck) return;
    setCheckingHandles(true);
    setHandleResults(null);
    
    await new Promise((resolve) => setTimeout(resolve, 700));
    const results = simulateHandleAvailability(handleToCheck, primaryPlatform || undefined);
    setHandleResults(results);

    // Save linked accounts
    const linkedAccounts: Record<string, string | null> = {};
    results.forEach((result) => {
      const handle = result.handle.replace('@', '');
      if (result.platform === 'Instagram') linkedAccounts.instagram = handle;
      else if (result.platform === 'TikTok') linkedAccounts.tiktok = handle;
      else if (result.platform === 'X') linkedAccounts.x = handle;
      else if (result.platform === 'YouTube') linkedAccounts.youtube = handle;
    });
    
    await updateProfileProgress({ linked_accounts: linkedAccounts });
    setCheckingHandles(false);
  }

  async function handleGenerateHandleSuggestions() {
    if (!vision.trim()) return;
    
    setLoadingSuggestions(true);
    try {
      // Call the generator (Mock or Real)
      const handles = await generateVisionHandles({ vision: vision.trim() });
      setSuggestedHandles(handles);
    } catch (error) {
      console.error('Failed to generate handles:', error);
      // Fallback to empty if fail
      setSuggestedHandles([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function handleSelectSuggestedHandle(handle: string) {
    const cleanHandle = handle.replace('@', ''); // Remove @ for input
    setRawHandle(cleanHandle);
    // Automatically trigger the check
    handleCheckHandles(cleanHandle);
  }

  async function handleGenerateVisionBios(refinement?: string) {
    const visionToUse = editableVision.trim() || vision.trim();
    if (!visionToUse) return;
    setBiosError(null);
    setBiosLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const output = await generateVisionBios({ 
        vision: visionToUse, 
        userId: user?.id,
        refinement: refinement
      });
      setVisionBios(output);
      // Update main vision if we used editable vision
      if (editableVision.trim() && editableVision !== vision) {
        setVision(editableVision.trim());
        await updateProfileProgress({ brand_vision: editableVision.trim() });
      }
    } catch (err: any) {
      setBiosError(err?.message || 'Failed to generate bios. Please try again.');
    } finally {
      setBiosLoading(false);
    }
  }

  async function handleGenerateImage(useRefinement = false) {
    if (!niche.trim() || !vibe.trim()) {
      // Generate placeholder if missing niche/vibe
      const placeholderUrl = `data:image/svg+xml;base64,${btoa(
        `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#1e293b"/>
          <circle cx="200" cy="180" r="60" fill="#f59e0b" opacity="0.3"/>
          <text x="200" y="280" font-family="Arial" font-size="16" fill="#f59e0b" text-anchor="middle">Profile Image</text>
          <text x="200" y="300" font-family="Arial" font-size="12" fill="#94a3b8" text-anchor="middle">Complete Steps 0-2 for full generation</text>
        </svg>`
      )}`;
      setImageUrl(placeholderUrl);
      return;
    }

    setImageGenerating(true);
    setImageError(null);
    if (!useRefinement) setImageUrl(null);

    try {
      // TODO: Implement generateProfileImage function or use image generation API
      // For now, use placeholder
      const placeholderUrl = `data:image/svg+xml;base64,${btoa(
        `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#1e293b"/>
          <circle cx="200" cy="180" r="60" fill="#f59e0b" opacity="0.3"/>
          <text x="200" y="280" font-family="Arial" font-size="16" fill="#f59e0b" text-anchor="middle">Profile Image</text>
        </svg>`
      )}`;
      setImageUrl(placeholderUrl);
    } catch (err: any) {
      // If generation fails, provide placeholder so user can continue
      console.warn('Image generation failed, using placeholder:', err);
      const placeholderUrl = `data:image/svg+xml;base64,${btoa(
        `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#1e293b"/>
          <circle cx="200" cy="180" r="60" fill="#f59e0b" opacity="0.3"/>
          <text x="200" y="280" font-family="Arial" font-size="16" fill="#f59e0b" text-anchor="middle">Profile Image</text>
          <text x="200" y="300" font-family="Arial" font-size="12" fill="#94a3b8" text-anchor="middle">${niche.trim()}</text>
        </svg>`
      )}`;
      setImageUrl(placeholderUrl);
    } finally {
      setImageGenerating(false);
    }
  }

  async function handleSaveImage() {
    // Save the current imageUrl to profile and redirect
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        // If no user (mock mode), still redirect to dashboard
        router.push('/dashboard/library');
        return;
      }

      // Save image to profile if imageUrl exists
      if (imageUrl) {
        const { error } = await supabase
          .from('profiles')
          .update({ profile_image_url: imageUrl })
          .eq('id', user.id);

        if (error) throw error;
      }

      // Success: Redirect to dashboard library
      router.push('/dashboard/library');
    } catch (err: any) {
      // Even on error, redirect to dashboard (user can fix later)
      console.error('Failed to save image:', err);
      router.push('/dashboard/library');
    }
  }

  async function updateProfileProgress(partial?: any) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const updateData: any = { id: user.id };
      if (partial) Object.assign(updateData, partial);
      if (niche) updateData.niche = niche;
      if (vibe) updateData.vibe = vibe;
      if (vision) updateData.brand_vision = vision;

      await supabase.from('profiles').upsert(updateData);
    } catch (err) {
      console.error('Error updating profile progress:', err);
    }
  }

  async function handleBypassAuth() {
    if (isLocalhost()) {
      setHasPurchasedPackage(true);
      return;
    }
    setForceUnlockLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Please sign in first.');
      await supabase
        .from('profiles')
        .update({ has_purchased_package: true, purchased_package_type: 'vault', founder_license: true })
        .eq('id', user.id);
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      console.error('Error force unlocking:', err);
    } finally {
      setForceUnlockLoading(false);
    }
  }

  async function handlePurchase(packageType: 'sniper' | 'vault') {
    setCheckoutLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?returnTo=/identity`);
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageType, userId: user.id }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setCheckoutLoading(false);
    }
  }

  // ==================== RENDER ====================
  if (checkingAccess) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <p className="text-sm text-slate-400">Checking access...</p>
      </main>
    );
  }

  if (!hasPurchasedPackage) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="text-center space-y-4">
          <Lock className="mx-auto h-16 w-16 text-amber-400" />
          <h1 className="text-3xl font-semibold text-slate-50">Package Required</h1>
          <p className="text-slate-300">The Authority Architect requires a package purchase.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 w-full max-w-2xl">
          <div className="rounded-2xl border-2 border-slate-800 bg-slate-900/80 p-6">
            <div className="text-right mb-4">
              <div className="text-2xl font-bold text-slate-50">$149</div>
              <div className="text-xs text-slate-400">One-Time</div>
            </div>
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Identity Sniper</h3>
            <p className="text-xs text-slate-300 mb-4">Cross-platform handles, 3 bios, niche analysis</p>
            <button
              onClick={() => handlePurchase('sniper')}
              disabled={checkoutLoading}
              className="w-full rounded-full border-2 border-amber-500 bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
            >
              Get Identity Package
            </button>
          </div>
          <div className="rounded-2xl border-2 border-amber-500 bg-amber-500/10 p-6">
            <div className="text-right mb-4">
              <div className="text-2xl font-bold text-slate-50">$299</div>
              <div className="text-xs text-slate-400">One-Time</div>
            </div>
            <h3 className="text-lg font-semibold text-slate-50 mb-2">Authority Vault</h3>
            <p className="text-xs text-slate-300 mb-4">Everything + 30 days of blueprints (90 scripts)</p>
            <button
              onClick={() => handlePurchase('vault')}
              disabled={checkoutLoading}
              className="w-full rounded-full border-2 border-amber-500 bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
            >
              Get Authority Vault
            </button>
          </div>
        </div>
        {isLocalhost() && (
          <button
            onClick={handleBypassAuth}
            disabled={forceUnlockLoading}
            className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:border-emerald-500 hover:bg-emerald-500/20"
          >
            🎭 Bypass Auth (Localhost)
          </button>
        )}
      </main>
    );
  }

  // ==================== DEMO MODE HANDLER ====================
  function handleDemoMode() {
    if (process.env.NODE_ENV !== 'development') return;
    
    // Set vision state
    setVision('I want to build a fitness brand for busy dads.');
    
    // Set handle
    setRawHandle('fitdad_life');
    setSelectedHandle('@fitdad_life');
    
    // Set platform
    setPrimaryPlatform('Instagram');
    setHasAccount(true);
    
    // Set niche and vibe
    setNiche('fitness for busy parents');
    setVibe('motivational and practical');
    
    // Set mock bios (as arrays)
    setVisionBios({
      authority: [
        '💪 Transforming busy dads into fit fathers',
        '🏋️ Practical workouts that fit your life',
        '📈 Results-driven fitness for men who prioritize family'
      ],
      relatability: [
        '😅 I know what it\'s like to juggle work, kids, and gym time',
        '💯 Here\'s how I do it—and how you can too',
        '🤝 No BS, just real results'
      ],
      mystery: [
        '🔥 The 15-minute workout that changed everything',
        '🤫 What I learned in 5 years of dad life',
        '✨ The fitness industry won\'t tell you'
      ]
    });
    setSelectedBioType('authority');
    
    // Set handle results
    setHandleResults([
      { platform: 'Instagram', handle: '@fitdad_life', available: true },
      { platform: 'TikTok', handle: '@fitdad_life', available: true },
      { platform: 'X', handle: '@fitdad_life', available: true },
      { platform: 'YouTube', handle: '@fitdad_life', available: true }
    ]);
    
    // Force jump to Step 5 (Profile Pic)
    setStep(5);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10 text-slate-50">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
        <p className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
            Authority Architect
          </p>
          {process.env.NODE_ENV === 'development' && (
            <button
              type="button"
              onClick={handleDemoMode}
              className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-all hover:border-emerald-500 hover:bg-emerald-500/20"
            >
              <Zap className="h-3 w-3" />
              ⚡ Demo Mode (Dev)
            </button>
          )}
        </div>
        <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
          Shape the face of your online world.
        </h1>
        <p className="max-w-2xl text-sm text-slate-300">
          We&apos;ll walk through your brand brief, handles, bios, and image—step by step. No fluff, just clear choices.
        </p>
      </header>

      {/* Step Indicator - Dynamic based on platform flow */}
      <nav className={`grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-sm ${
        steps.length === 6 ? 'md:grid-cols-6' : steps.length === 7 ? 'md:grid-cols-7' : 'md:grid-cols-6'
      }`}>
        {steps.map((stepName, index) => {
          const stepLabels: Record<StepName, { label: string; description: string }> = {
            'Platform': { label: 'Platform', description: 'Choose your platform.' },
            'Purpose': { label: 'Purpose', description: 'Define your vision.' },
            'Setup Guide': { label: 'Setup Guide', description: 'Account setup help.' },
            'Handle Sniper': { label: 'Handle Sniper', description: 'Find a clean handle.' },
            'Bio Architect': { label: 'Bio Architect', description: 'Put words to your purpose.' },
            'Pro Bio': { label: 'Pro Bio', description: 'Craft your professional bio.' },
            'Channel Description': { label: 'Channel Description', description: 'SEO-rich channel description.' },
            'Channel Banner': { label: 'Channel Banner', description: 'Design your channel banner.' },
            'Header Image': { label: 'Header Image', description: 'Create your header image.' },
            'Brand Identity': { label: 'Brand Identity', description: 'Create your brand logo.' },
          };
          
          const stepInfo = stepLabels[stepName];
          return (
        <StepChip
              key={stepName}
              index={index}
              label={stepInfo.label}
              description={stepInfo.description}
              active={step === index}
              complete={step > index}
            />
          );
        })}
      </nav>

      {/* Step Content - Dynamic based on current step name */}
      <section className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl md:p-8">
        {currentStepName === 'Platform' && (
          <PlatformCommand
            primaryPlatform={primaryPlatform}
            onSelectPlatform={handlePlatformSelect}
          />
        )}
        {currentStepName === 'Purpose' && (
          <PurposeStep
            vision={vision}
            setVision={setVision}
          />
        )}
        {currentStepName === 'Setup Guide' && (
          <SetupGuideStep
            primaryPlatform={primaryPlatform}
            hasAccount={hasAccount}
            setHasAccount={setHasAccount}
            setupGuideStep={setupGuideStep}
            setSetupGuideStep={setSetupGuideStep}
            rawHandle={rawHandle}
            onSkip={() => setStep(3)}
          />
        )}
        {currentStepName === 'Handle Sniper' && (
          <UsernameSniper
            rawHandle={rawHandle}
            setRawHandle={setRawHandle}
            checking={checkingHandles}
            results={handleResults}
            onCheck={handleCheckHandles}
            primaryPlatform={primaryPlatform}
            selectedHandle={selectedHandle}
            setSelectedHandle={setSelectedHandle}
            suggestedHandles={suggestedHandles}
            loadingSuggestions={loadingSuggestions}
            onGenerateSuggestions={handleGenerateHandleSuggestions}
            onSelectSuggestedHandle={handleSelectSuggestedHandle}
          />
        )}
        {(currentStepName === 'Bio Architect' || currentStepName === 'Pro Bio') && (
          <BioArchitect
            vision={vision}
            editableVision={editableVision}
            setEditableVision={setEditableVision}
            isEditingVision={isEditingVision}
            setIsEditingVision={setIsEditingVision}
            visionBios={visionBios}
            loading={biosLoading}
            error={biosError}
            selectedBioType={selectedBioType}
            onSelectBio={setSelectedBioType}
            onRegenerate={handleGenerateVisionBios}
          />
        )}
        {currentStepName === 'Channel Description' && (
          <SmartDescriptionGenerator
            vision={vision}
            platform="youtube"
            onSelect={(description) => {
              // Save selected description to vision state for now
              setVision(description);
            }}
          />
        )}
        {(currentStepName === 'Pro Bio') && (
          <SmartDescriptionGenerator
            vision={vision}
            platform="x"
            onSelect={(description) => {
              // Save selected description to vision state for now
              setVision(description);
            }}
          />
        )}
        {currentStepName === 'Channel Banner' && (
          <BannerGenerator
            platform="youtube"
            vision={vision}
            onComplete={() => setStep((prev) => (prev + 1) as Step)}
          />
        )}
        {currentStepName === 'Header Image' && (
          <BannerGenerator
            platform="x"
            vision={vision}
            onComplete={() => setStep((prev) => (prev + 1) as Step)}
          />
        )}
        {currentStepName === 'Brand Identity' && (
          <BrandLogoGenerator
            selectedHandle={selectedHandle}
            onComplete={handleSaveImage}
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
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-700 px-5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back
        </button>
          {(step < 5 && step !== 0) && (
            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-700 px-5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-900"
            >
              Skip
            </button>
          )}
        </div>
        {step !== 0 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-500 px-8 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
            {step >= steps.length - 1 ? 'Save Progress' : 'Next'}
            </button>
          )}
      </div>
    </main>
  );
}

// ==================== SUB-COMPONENTS ====================
function StepChip(props: { index: number; label: string; description: string; active: boolean; complete: boolean }) {
  const { index, label, description, active, complete } = props;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${active ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-900/80'}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${complete ? 'bg-emerald-500 text-slate-950' : active ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}>
        {complete ? <CheckCircle2 className="h-4 w-4" /> : index}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

// ==================== STEP 0: PLATFORM COMMAND ====================
function PlatformCommand(props: {
  primaryPlatform: Platform | null;
  onSelectPlatform: (platform: Platform) => void;
}) {
  const { primaryPlatform, onSelectPlatform } = props;

  // Official Brand Logo SVGs
  const PlatformLogo = ({ platform }: { platform: Platform }) => {
    const isActive = primaryPlatform === platform;
    const uniqueId = `${platform.toLowerCase()}-${isActive ? 'active' : 'inactive'}`;
    
    switch (platform) {
      case 'Instagram':
        return (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`ig-gradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#833AB4" />
                <stop offset="50%" stopColor="#FD1D1D" />
                <stop offset="100%" stopColor="#FCAF45" />
              </linearGradient>
            </defs>
            {/* Camera square with rounded corners */}
            <rect x="8" y="8" width="32" height="32" rx="8" fill={`url(#ig-gradient-${uniqueId})`} />
            {/* Inner circle (lens) */}
            <circle cx="24" cy="24" r="8" fill="none" stroke="white" strokeWidth="2.5" />
            {/* Center dot */}
            <circle cx="24" cy="24" r="2.5" fill="white" />
            {/* Top-right corner dot (viewfinder) */}
            <circle cx="32" cy="16" r="2.5" fill="white" />
          </svg>
        );
      
      case 'TikTok':
        return (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* TikTok Music Note - Official Logo Shape */}
            {/* Left circle (note head) */}
            <circle cx="16" cy="28" r="4" fill={isActive ? "#00F2EA" : "#FF0050"} />
            {/* Right circle (note head) */}
            <circle cx="28" cy="32" r="4" fill={isActive ? "#FF0050" : "#00F2EA"} />
            {/* Vertical stem */}
            <rect x="19" y="12" width="3" height="20" rx="1.5" fill={isActive ? "#00F2EA" : "#FF0050"} />
            {/* Curved line connecting to top note */}
            <path
              d="M19 12 Q22 8 28 10"
              stroke={isActive ? "#FF0050" : "#00F2EA"}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Horizontal bar */}
            <rect x="14" y="28" width="18" height="3" rx="1.5" fill={isActive ? "#00F2EA" : "#FF0050"} />
          </svg>
        );
      
      case 'X':
        return (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14 14L34 34M34 14L14 34"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      
      case 'YouTube':
        return (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="12" width="40" height="24" rx="4" fill="#FF0000" />
            <path
              d="M30 24L20 18V30L30 24Z"
              fill="white"
            />
          </svg>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">Platform Command</h2>
        <p className="text-sm text-slate-300">
          Choose your primary platform. We&apos;ll tailor everything to this first.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PLATFORMS.map((platform) => {
          // TODO: Use selectedPlatform to toggle between 'Bio' (IG/TikTok) and 'Channel Description' (YouTube) in the next step
          const handleClick = () => {
            onSelectPlatform(platform);
            // Platform selection updates primaryPlatform state automatically
            // This will be used in subsequent steps to customize the experience
          };

          return (
            <button
              key={platform}
              type="button"
              onClick={handleClick}
              className={`group relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 p-6 text-center transition-all ${
                primaryPlatform === platform
                  ? 'border-amber-500 bg-amber-500/10 scale-[1.02] shadow-lg shadow-amber-500/20'
                  : 'border-slate-800 bg-slate-950/60 hover:border-amber-500/50 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center justify-center">
                <PlatformLogo platform={platform} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-50">{platform}</h3>
              </div>
              {primaryPlatform === platform && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="h-5 w-5 text-amber-400" />
                </div>
              )}
            </button>
          );
        })}
        </div>
      </div>
  );
}

// ==================== STEP 1: THE PURPOSE (VISION) ====================
function PurposeStep(props: {
  vision: string;
  setVision: (value: string) => void;
}) {
  const { vision, setVision } = props;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">The Purpose</h2>
        <p className="text-sm text-slate-300">
          What is this account for? Share your vision, goals, or what you want to build.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-200">
          Brand Vision
        </label>
        <textarea
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          placeholder="I want to build a fitness brand for busy dads who want to get in shape without spending hours at the gym..."
          rows={8}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
        />
        <p className="text-xs text-slate-400">
          Share your vision, goals, values, or what you want to be known for. Messy thoughts are welcome!
        </p>
      </div>
    </div>
  );
}

// ==================== STEP 2: SETUP GUIDE ====================
function SetupGuideStep(props: {
  primaryPlatform: Platform | null;
  hasAccount: boolean | null;
  setHasAccount: (value: boolean) => void;
  setupGuideStep: 1 | 2 | 3;
  setSetupGuideStep: (step: 1 | 2 | 3) => void;
  rawHandle: string;
  onSkip: () => void;
}) {
  const { primaryPlatform, hasAccount, setHasAccount, setupGuideStep, setSetupGuideStep, rawHandle, onSkip } = props;

  // If user already has account, show message and auto-advance
  if (hasAccount === true) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
          <h3 className="text-lg font-semibold text-slate-50 mb-2">Account Ready</h3>
          <p className="text-sm text-slate-300">
            Since you already have an account, let&apos;s move on to securing your handle.
          </p>
        </div>
          <button
            type="button"
          onClick={onSkip}
          className="w-full inline-flex min-h-[60px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400"
        >
          Continue to Handle Sniper
          <ArrowRight className="h-5 w-5" />
          </button>
        </div>
    );
  }

  // Platform-specific setup guides with screenshot placeholders
  const guides: Record<Platform, Array<{ 
    step: number; 
    title: string; 
  description: string;
    screenshotLabel: string;
    screenshotIcon: string;
  }>> = {
    Instagram: [
      {
        step: 1,
        title: 'Open Settings',
        description: 'Open Profile > Menu (≡) > Settings and privacy.',
        screenshotLabel: 'Screenshot: Settings Menu',
        screenshotIcon: '📸',
      },
      {
        step: 2,
        title: 'Add Account',
        description: 'Tap "Accounts Center" > "Add more accounts".',
        screenshotLabel: 'Screenshot: Accounts Center',
        screenshotIcon: '📝',
      },
      {
        step: 3,
        title: 'Create Account',
        description: `Select "Create new account" and pick your handle: ${rawHandle || '@yourname'}. Make sure it matches what you checked in the Handle Sniper.`,
        screenshotLabel: 'Screenshot: Handle Selection',
        screenshotIcon: '✏️',
      },
    ],
    TikTok: [
      {
        step: 1,
        title: 'Download TikTok',
        description: 'Download the TikTok app from the App Store or Google Play Store',
        screenshotLabel: 'Screenshot: App Store',
        screenshotIcon: '📱',
      },
      {
        step: 2,
        title: 'Sign Up',
        description: 'Open the app → Tap "Sign up" → Choose email or phone → Enter your information',
        screenshotLabel: 'Screenshot: Sign Up Screen',
        screenshotIcon: '🎬',
      },
      {
        step: 3,
        title: 'Set Username',
        description: `Choose your username: ${rawHandle || '@yourname'}. This will be your @handle on TikTok.`,
        screenshotLabel: 'Screenshot: Username Entry',
        screenshotIcon: '✏️',
      },
    ],
    X: [
      {
        step: 1,
        title: 'Go to x.com',
        description: 'Navigate to x.com (formerly Twitter.com) in your browser',
        screenshotLabel: 'Screenshot: X.com Homepage',
        screenshotIcon: '🌐',
      },
      {
        step: 2,
        title: 'Create Account',
        description: 'Click "Sign up" → Enter your name, email/phone, and date of birth → Verify your email/phone',
        screenshotLabel: 'Screenshot: Sign Up Form',
        screenshotIcon: '📝',
      },
      {
        step: 3,
        title: 'Choose Handle',
        description: `Set your @username: ${rawHandle || '@yourname'}. This is your unique handle on X.`,
        screenshotLabel: 'Screenshot: Username Selection',
        screenshotIcon: '✏️',
      },
    ],
    YouTube: [
      {
        step: 1,
        title: 'Sign in to Google',
        description: 'Go to youtube.com → Click "Sign in" → Use your Google account (or create one)',
        screenshotLabel: 'Screenshot: Google Sign In',
        screenshotIcon: '🔐',
      },
      {
        step: 2,
        title: 'Create Channel',
        description: 'Click your profile icon → Select "Create a channel" → Choose "Use a business or other name"',
        screenshotLabel: 'Screenshot: Create Channel',
        screenshotIcon: '📺',
      },
      {
        step: 3,
        title: 'Set Channel Name',
        description: `Enter your channel name. For your handle, use: ${rawHandle || '@yourname'}. This will be your @handle on YouTube.`,
        screenshotLabel: 'Screenshot: Channel Setup',
        screenshotIcon: '✏️',
      },
    ],
  };

  if (!primaryPlatform) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Please select a platform first.</p>
      </div>
    );
  }

  const currentGuide = guides[primaryPlatform];
  const currentStep = currentGuide.find(item => item.step === setupGuideStep) || currentGuide[0];

  function handlePrevious() {
    if (setupGuideStep > 1) {
      setSetupGuideStep((setupGuideStep - 1) as 1 | 2 | 3);
    }
  }

  function handleNext() {
    if (setupGuideStep < 3) {
      setSetupGuideStep((setupGuideStep + 1) as 1 | 2 | 3);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">Account Setup Guide</h2>
        <p className="text-sm text-slate-300">
          Follow these steps to set up your {primaryPlatform} account.
        </p>
      </div>

      {/* 2-Column Layout: Instructions + iPhone Frame */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Instructions */}
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-amber-500 bg-amber-500/10 p-6 transition">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-xl font-bold text-slate-950">
                {currentStep.step}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-50 mb-3">
                  Step {currentStep.step}: {currentStep.title}
                </h3>
                <p className="text-base text-slate-300 leading-relaxed">
                  {currentStep.description}
                </p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-amber-500/30">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={setupGuideStep === 1}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Previous Step
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={setupGuideStep === 3}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-5 text-sm font-semibold text-slate-950 shadow-md hover:border-amber-400 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next Step
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: iPhone Frame */}
        <div className="flex items-center justify-center">
          <div className="relative w-full max-w-[280px]">
            {/* iPhone Frame */}
            <div className="relative rounded-[3rem] border-[12px] border-slate-900 bg-slate-900 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140px] h-[30px] bg-slate-900 rounded-b-3xl z-10" />
              
              {/* Screen */}
              <div className="relative w-full aspect-[9/19.5] bg-slate-950 rounded-[2.25rem] overflow-hidden">
                {/* Screen Content */}
                <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center p-8">
                  <div className="text-6xl mb-4">{currentStep.screenshotIcon}</div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                      {currentStep.screenshotLabel}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Screenshot placeholder
                    </p>
                  </div>
                </div>
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Skip Button */}
      <div className="flex items-center justify-center pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={() => setHasAccount(true)}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-slate-700 px-6 text-sm font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-900 transition"
        >
          I already have an account
        </button>
      </div>
    </div>
  );
}

// ==================== STEP: SMART DESCRIPTION GENERATOR (YouTube/X) ====================
function SmartDescriptionGenerator(props: {
  vision: string;
  platform: 'youtube' | 'x';
  onSelect?: (description: string) => void;
}) {
  const { vision, platform, onSelect } = props;
  const [descriptions, setDescriptions] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState<string>('');
  const [refining, setRefining] = useState<boolean>(false);

  const isYouTube = platform === 'youtube';

  useEffect(() => {
    // Auto-generate descriptions on mount
    if (vision.trim() && !descriptions) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vision]);

  async function handleGenerate(refinement?: string) {
    setLoading(true);
    try {
      const { generateDescriptionOptions } = await import('@/lib/gemini');
      const result = await generateDescriptionOptions(vision, platform, refinement);
      setDescriptions(result);
      setRefinementPrompt('');
    } catch (error) {
      console.error('Failed to generate descriptions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefine() {
    if (!refinementPrompt.trim()) return;
    setRefining(true);
    try {
      await handleGenerate(refinementPrompt.trim());
    } finally {
      setRefining(false);
    }
  }

  function handleSelectOption(index: number) {
    setSelectedIndex(index);
    if (onSelect && descriptions?.options?.[index]) {
      onSelect(descriptions.options[index].text);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">
          {isYouTube ? 'Channel Description' : 'Pro Bio'}
        </h2>
        <p className="text-sm text-slate-300">
          AI-generated {isYouTube ? 'SEO-rich channel descriptions' : 'professional bios'} tailored to your vision.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 animate-pulse">
              <div className="h-4 w-20 bg-slate-700 rounded mb-3" />
              <div className="space-y-2 mb-4">
                <div className="h-3 w-full bg-slate-700 rounded" />
                <div className="h-3 w-full bg-slate-700 rounded" />
                <div className="h-3 w-3/4 bg-slate-700 rounded" />
              </div>
              <div className="h-3 w-24 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Description Cards */}
      {!loading && descriptions && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {descriptions.options.map((option: any, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectOption(index)}
                className={`relative text-left rounded-2xl border-2 p-6 transition ${
                  selectedIndex === index
          ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-amber-500/50'
                }`}
              >
                {selectedIndex === index && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className="h-5 w-5 text-amber-400" />
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-sm text-slate-200 leading-relaxed">{option.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {option.strategyTags?.map((tag: string, tagIndex: number) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
      </div>
                  <p className="text-xs text-slate-400 italic">{option.strategyNote}</p>
      </div>
              </button>
            ))}
          </div>

          {/* AI Refinement Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-200">
              Tell AI how to tweak these...
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                placeholder="e.g., 'Make it funnier', 'Add emojis', 'More professional tone'"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              />
              <button
                type="button"
                onClick={handleRefine}
                disabled={!refinementPrompt.trim() || refining}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-6 py-3 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Refine
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Button */}
      {!loading && descriptions && (
        <button
          type="button"
          onClick={() => handleGenerate()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
        >
          <Zap className="h-4 w-4" />
          Regenerate All Options
        </button>
      )}
    </div>
  );
}

// ==================== STEP: AI BANNER GENERATOR (YouTube/X) - Recommendation-Driven ====================
function BannerGenerator(props: {
  platform: 'youtube' | 'x';
  vision?: string;
  onComplete?: () => void;
}) {
  const { platform, vision, onComplete } = props;
  const [concepts, setConcepts] = useState<any>(null);
  const [loadingConcepts, setLoadingConcepts] = useState<boolean>(false);
  const [selectedConceptIndex, setSelectedConceptIndex] = useState<number | null>(null);
  const [refinement, setRefinement] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<boolean>(false);

  const isYouTube = platform === 'youtube';
  const aspectRatio = isYouTube ? '16:9' : '3:1';
  const recommendedSize = isYouTube ? '2560 x 1440px' : '1500 x 500px';
  const previewHeight = isYouTube ? 'h-48' : 'h-32';

  useEffect(() => {
    // Auto-load banner concepts on mount
    if (vision && !concepts && !loadingConcepts) {
      handleLoadConcepts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vision]);

  async function handleLoadConcepts() {
    setLoadingConcepts(true);
    try {
      const { generateBannerConcepts } = await import('@/lib/gemini');
      // Extract niche and vibe from vision (simple heuristic)
      const nicheWords = vision?.split(/\s+/).slice(0, 3).join(' ') || 'content creator';
      const vibeWords = vision?.split(/\s+/).slice(3, 6).join(' ') || 'professional';
      const result = await generateBannerConcepts(nicheWords, vibeWords, platform);
      setConcepts(result);
    } catch (error) {
      console.error('Failed to load banner concepts:', error);
    } finally {
      setLoadingConcepts(false);
    }
  }

  async function handleGenerateBanner() {
    if (selectedConceptIndex === null || !concepts?.concepts?.[selectedConceptIndex]) return;
    
    const selectedConcept = concepts.concepts[selectedConceptIndex];
    const baseVisualDescription = selectedConcept.visualDescription;
    
    // Build final prompt: If user has typed a long custom description, prioritize it
    // Otherwise, combine base style with refinement
    let finalPrompt: string;
    if (refinement.trim().length > 50) {
      // Long custom description takes priority - treat as full vision override
      finalPrompt = refinement.trim();
    } else if (refinement.trim()) {
      // Short refinement - append to base style
      finalPrompt = `${baseVisualDescription}. Refinement: ${refinement.trim()}`;
    } else {
      // No refinement - use base style only
      finalPrompt = baseVisualDescription;
    }
    
    // If regenerating (banner already exists), show regenerating state
    if (bannerUrl) {
      setRegenerating(true);
    } else {
      setGenerating(true);
    }
    
    try {
      // Call real image generation API
      const imageUrl = await generateBrandAsset(finalPrompt, 'banner');
      setBannerUrl(imageUrl);
    } catch (error) {
      console.error('Failed to generate banner:', error);
      alert('Failed to generate banner. Please try again.');
    } finally {
      setGenerating(false);
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">
          {isYouTube ? 'Channel Banner' : 'Header Image'}
        </h2>
        <p className="text-sm text-slate-300">
          {isYouTube 
            ? 'Choose a professional design direction and let AI generate your channel banner' 
            : 'Choose a design direction and let AI create your header image'
          }
        </p>
      </div>

      {/* Concept Selector */}
      {loadingConcepts && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 animate-pulse">
              <div className="h-5 w-32 bg-slate-700 rounded mb-3" />
              <div className="flex gap-2 mb-3">
                <div className="h-6 w-6 rounded-full bg-slate-700" />
                <div className="h-6 w-6 rounded-full bg-slate-700" />
                <div className="h-6 w-6 rounded-full bg-slate-700" />
              </div>
              <div className="h-16 w-full bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loadingConcepts && concepts && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {concepts.concepts.map((concept: any, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedConceptIndex(index)}
                className={`relative text-left rounded-2xl border-2 p-6 transition ${
                  selectedConceptIndex === index
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-amber-500/50'
                }`}
              >
                {selectedConceptIndex === index && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className="h-5 w-5 text-amber-400" />
                  </div>
                )}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-50">{concept.styleName}</h3>
                  <div className="flex items-center gap-2">
                    {concept.colorPalette?.map((color: string, colorIndex: number) => (
                      <div
                        key={colorIndex}
                        className="w-6 h-6 rounded-full border-2 border-slate-700"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{concept.reasoning}</p>
                </div>
              </button>
            ))}
          </div>

          {/* AI Refinement Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Refine or Describe Your Own Vision
            </label>
            <textarea
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder="e.g., Make it darker, OR describe exactly what you want (e.g., futuristic city skyline with neon blue lights)..."
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
            />
            <p className="text-xs text-slate-400">
              You can use the styles above as a starting point, or type a completely new idea here to override them.
            </p>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerateBanner}
            disabled={selectedConceptIndex === null || generating || regenerating}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-500 bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(generating || regenerating) ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {regenerating ? 'Regenerating...' : 'Generating Banner...'}
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                {bannerUrl ? 'Regenerate Banner' : 'Generate Banner'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Generated Banner Preview */}
      {bannerUrl && !generating && !regenerating && (
        <div className="space-y-4">
          <div className="relative rounded-2xl border-2 border-amber-500/50 bg-slate-950/60 p-6">
            <div className={`w-full ${previewHeight} rounded-xl overflow-hidden mb-4 bg-slate-900`}>
              <img
                src={bannerUrl}
                alt={`${isYouTube ? 'Channel' : 'Header'} banner preview`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
                Aspect Ratio: {aspectRatio} • Recommended: {recommendedSize}
              </p>
              <button
                type="button"
                onClick={() => {
                  setBannerUrl(null);
                  setSelectedConceptIndex(null);
                }}
                className="text-sm text-slate-400 hover:text-slate-200 transition"
              >
                Generate New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Placeholder (Before Generation) */}
      {!bannerUrl && !generating && (
        <div className="relative rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-12 text-center">
          <div className={`w-full ${previewHeight} rounded-xl bg-slate-900/60 border border-slate-800 mb-6 flex items-center justify-center`}>
            <div className="text-center space-y-2">
              <div className="text-4xl">🎨</div>
              <p className="text-sm text-slate-400">{aspectRatio} Banner Preview</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Select a design concept above and click "Generate Banner" to create your {isYouTube ? 'channel banner' : 'header image'}</p>
        </div>
      )}
    </div>
  );
}

// ==================== STEP 3: HANDLE SNIPER ====================
function UsernameSniper(props: {
  rawHandle: string;
  setRawHandle: (value: string) => void;
  checking: boolean;
  results: HandleCheck[] | null;
  onCheck: () => void;
  primaryPlatform: Platform | null;
  selectedHandle: string;
  setSelectedHandle: (value: string) => void;
  suggestedHandles: string[];
  loadingSuggestions: boolean;
  onGenerateSuggestions: () => void;
  onSelectSuggestedHandle: (handle: string) => void;
}) {
  const { 
    rawHandle, 
    setRawHandle, 
    checking, 
    results, 
    onCheck, 
    primaryPlatform, 
    selectedHandle, 
    setSelectedHandle,
    suggestedHandles,
    loadingSuggestions,
    onGenerateSuggestions,
    onSelectSuggestedHandle
  } = props;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">Handle Sniper</h2>
        <p className="text-sm text-slate-300">Check availability across Instagram, TikTok, X, and YouTube.</p>
      </div>

      {/* AI Suggested Handles */}
      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <label className="text-sm font-medium text-slate-200">✨ AI Suggested Handles</label>
          </div>
          {suggestedHandles.length === 0 && (
            <button
              type="button"
              onClick={onGenerateSuggestions}
              disabled={loadingSuggestions}
              className="inline-flex min-h-[32px] items-center justify-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 text-xs font-semibold text-amber-400 transition-all hover:border-amber-500 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingSuggestions ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Ideas'
              )}
            </button>
          )}
        </div>

        {loadingSuggestions && suggestedHandles.length === 0 && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            <p className="text-xs text-slate-400">Generating smart handle suggestions...</p>
          </div>
        )}

        {suggestedHandles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedHandles.map((handle) => (
              <button
                key={handle}
                type="button"
                onClick={() => onSelectSuggestedHandle(handle)}
                className="inline-flex min-h-[36px] items-center justify-center gap-1 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 text-xs font-medium text-amber-300 transition-all hover:border-amber-500 hover:bg-amber-500/20 hover:scale-105"
              >
                @{handle}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-200">Your ideal handle</label>
        <div className="flex flex-col gap-3 md:flex-row">
          <input value={rawHandle} onChange={(e) => setRawHandle(e.target.value)} placeholder="@yourname" className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" />
          <button type="button" onClick={onCheck} disabled={!rawHandle.trim() || checking} className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
            {checking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</> : 'Check handles'}
          </button>
        </div>
      </div>

      {results && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {results.map((item) => (
            <div key={item.platform} className={`flex flex-col gap-3 rounded-2xl border p-4 cursor-pointer transition ${selectedHandle === item.handle ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}`} onClick={() => setSelectedHandle(item.handle)}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">{item.platform}</p>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${item.available ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                  {item.available ? 'Available' : 'Taken'}
                </span>
              </div>
              <p className="text-sm text-slate-200">{item.handle}</p>
              {!item.available && item.suggestions && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.suggestions.map((suggestion) => (
                      <button key={suggestion} type="button" onClick={(e) => { e.stopPropagation(); setRawHandle(suggestion); }} className="inline-flex min-h-[32px] items-center justify-center rounded-full border border-slate-700 px-3 text-xs text-slate-200 hover:border-amber-400 hover:text-amber-300">
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
  editableVision: string;
  setEditableVision: (value: string) => void;
  isEditingVision: boolean;
  setIsEditingVision: (value: boolean) => void;
  visionBios: VisionBios | null;
  loading: boolean;
  error: string | null;
  selectedBioType: 'authority' | 'relatability' | 'mystery' | null;
  onSelectBio: (type: 'authority' | 'relatability' | 'mystery') => void;
  onRegenerate: (refinement?: string) => void;
}) {
  const {
    vision, 
    editableVision, 
    setEditableVision, 
    isEditingVision, 
    setIsEditingVision,
    visionBios, 
    loading,
    error,
    selectedBioType, 
    onSelectBio,
    onRegenerate
  } = props;

  const refinementChips = [
    { label: '😂 Funnier', refinement: 'Make it funnier and more entertaining' },
    { label: '💼 More Professional', refinement: 'Make it more professional and formal' },
    { label: '⚡ Shorter', refinement: 'Make it shorter and more concise' },
    { label: '🎯 More Niche', refinement: 'Make it more niche-specific and targeted' },
  ];

  // Sanitize bio line: remove HTML entities
  function sanitizeBioLine(line: string): string {
    return line.replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">Bio Architect</h2>
        <p className="text-sm text-slate-300">
          Based on your vision, here are 3 strategic bio options: Authority (Expert), Relatable (Friend), and Mystery (Intrigue).
        </p>
      </div>

      {/* Alignment Check: Editable Vision */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        {!isEditingVision ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-400 mb-1">Analyzing Vision:</p>
              <p className="text-sm text-slate-200 italic">&quot;{editableVision || vision}&quot;</p>
        </div>
        <button
          type="button"
              onClick={() => setIsEditingVision(true)}
              className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 text-xs font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800 transition"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-400">Edit Vision:</label>
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                value={editableVision || vision}
                onChange={(e) => setEditableVision(e.target.value)}
                placeholder="I want to build a fitness brand for busy dads..."
                rows={3}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
              />
              <div className="flex gap-2 md:flex-col">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingVision(false);
                    onRegenerate();
                  }}
                  disabled={!editableVision.trim()}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-4 text-xs font-semibold text-slate-950 hover:border-amber-400 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Regenerate
        </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditableVision(vision);
                    setIsEditingVision(false);
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-700 bg-slate-950 px-4 text-xs font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-900 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading: Skeleton Cards */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 animate-pulse">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-slate-700" />
                  <div className="h-5 w-24 rounded bg-slate-700" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-slate-700" />
                  <div className="h-4 w-full rounded bg-slate-700" />
                  <div className="h-4 w-3/4 rounded bg-slate-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {/* Bio Cards */}
      {!loading && visionBios && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => onSelectBio('authority')} 
              className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition ${selectedBioType === 'authority' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-amber-400 hover:bg-slate-900'}`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">A</span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">Authority</span>
              </div>
                <div className="space-y-1">
                  {visionBios.authority.map((line, index) => (
                    <div key={index} className="text-sm text-slate-100 leading-relaxed">
                      {sanitizeBioLine(line)}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">Positions you as an expert with credentials and credibility.</p>
              </div>
            </button>

            <button 
              type="button" 
              onClick={() => onSelectBio('relatability')} 
              className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition ${selectedBioType === 'relatability' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-amber-400 hover:bg-slate-900'}`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">R</span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">Relatable</span>
                </div>
                <div className="space-y-1">
                  {visionBios.relatability.map((line, index) => (
                    <div key={index} className="text-sm text-slate-100 leading-relaxed">
                      {sanitizeBioLine(line)}
                    </div>
          ))}
        </div>
                <p className="text-[11px] text-slate-500">Makes you feel like a friend who gets it.</p>
              </div>
            </button>

            <button 
              type="button" 
              onClick={() => onSelectBio('mystery')} 
              className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition ${selectedBioType === 'mystery' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-amber-400 hover:bg-slate-900'}`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">M</span>
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">Mystery</span>
                </div>
                <div className="space-y-1">
                  {visionBios.mystery.map((line, index) => (
                    <div key={index} className="text-sm text-slate-100 leading-relaxed">
                      {sanitizeBioLine(line)}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">Creates intrigue and curiosity without revealing everything.</p>
              </div>
            </button>
          </div>

          {/* Refinement Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800">
            <p className="text-xs font-medium text-slate-400">Tune the tone:</p>
            {refinementChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => onRegenerate(chip.refinement)}
                className="inline-flex min-h-[36px] items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-4 text-xs font-medium text-slate-300 hover:border-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition"
              >
                {chip.label}
            </button>
          ))}
        </div>
        </>
      )}

      {/* Empty State: Show if no bios and not loading */}
      {!loading && !visionBios && !error && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
          <p className="text-sm text-slate-400">Generating bios based on your vision...</p>
        </div>
      )}
    </div>
  );
}

function BrandLogoGenerator(props: {
  selectedHandle: string;
  onComplete?: () => void;
}) {
  const { selectedHandle, onComplete } = props;
  const router = useRouter();

  // Extract brand vision from handle for AI context
  const fallbackVision = selectedHandle
    ? selectedHandle.replace('@', '').replace(/_/g, ' ').replace(/\./g, ' ')
    : 'modern creator brand helping people grow on social media';

  const [concepts, setConcepts] = useState<LogoConcept[]>([]);
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [customVision, setCustomVision] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Load AI concepts on mount
  useEffect(() => {
    const loadConcepts = async () => {
      setIsLoadingConcepts(true);
      try {
        const result = await generateLogoConcepts(fallbackVision);
        setConcepts(result);
      } catch (error) {
        console.error('Failed to load logo concepts:', error);
        // Fallback to empty array - UI will show error state
        setConcepts([]);
      } finally {
        setIsLoadingConcepts(false);
      }
    };
    loadConcepts();
  }, [fallbackVision]);

  const selectedConcept = selectedIndex !== null ? concepts[selectedIndex] : null;

  const handleGenerateFinal = async () => {
    setIsGenerating(true);
    setGeneratedImageUrl(null);

    try {
      // Determine final prompt: custom vision takes priority, then selected concept, then fallback
      const finalPrompt = customVision.trim()
        ? customVision.trim()
        : selectedConcept
        ? selectedConcept.visualPrompt
        : fallbackVision;

      console.log('Final logo generation prompt:', finalPrompt);

      // Call real image generation API
      const imageUrl = await generateBrandAsset(finalPrompt, 'logo');
      setGeneratedImageUrl(imageUrl);

      // Complete the step after successful generation
      if (onComplete) {
        await onComplete();
      } else {
        router.push('/dashboard/library');
      }
    } catch (error) {
      console.error('Failed to generate logo:', error);
      // Show error state - user can try again
      alert('Failed to generate logo. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-50">
          <Sparkles className="h-7 w-7 text-amber-400" />
          Brand Identity
        </h2>
        <p className="text-sm text-slate-300">AI-driven logo generation for your brand</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Concept Selection & Customization */}
        <div className="space-y-6">
          {/* Phase 1 & 2: Loading & Concept Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-200 uppercase tracking-wide">
                AI Logo Concepts
              </label>
              {isLoadingConcepts && (
                <span className="text-xs text-amber-400">Analyzing Brand Vision...</span>
              )}
            </div>

            {isLoadingConcepts ? (
              // Phase 1: Loading Skeletons
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border-2 border-slate-800 bg-slate-950/60 p-4 animate-pulse"
                  >
                    <div className="w-full h-32 rounded-xl bg-slate-800 mb-3" />
                    <div className="h-4 w-3/4 bg-slate-800 rounded mb-2" />
                    <div className="h-3 w-full bg-slate-800 rounded mb-1" />
                    <div className="h-3 w-5/6 bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              // Phase 2: Concept Cards
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {concepts.map((concept, index) => {
                  const isSelected = selectedIndex === index;

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className={`rounded-xl border-2 p-4 text-left transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <img
                        src={concept.placeholderImage}
                        alt={concept.title}
                        className="w-full h-32 object-cover rounded-xl border border-slate-800 mb-3"
                      />
                      <h3
                        className={`text-sm font-semibold mb-2 ${
                          isSelected ? 'text-amber-400' : 'text-slate-200'
                        }`}
                      >
                        {concept.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {concept.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phase 3: Custom Vision Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
              Or Describe Your Own Vision
            </label>
            <textarea
              value={customVision}
              onChange={(e) => setCustomVision(e.target.value)}
              rows={4}
              placeholder="e.g. A golden lion with digital eyes..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition resize-none"
            />
          </div>

          {/* Phase 4: Generate Button */}
          <button
            type="button"
            onClick={handleGenerateFinal}
            disabled={isGenerating || (!selectedConcept && !customVision.trim())}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[56px] rounded-xl border-2 border-amber-500 bg-amber-500 px-6 text-base font-semibold text-slate-950 hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Final Logo…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                ✨ Generate Brand Asset
              </>
            )}
          </button>
        </div>

        {/* Right Column: Preview Area */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">Preview</label>
            <div className="flex items-center justify-center rounded-2xl border-2 border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-12 min-h-[300px]">
              {isGenerating ? (
                // Generating animation
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
                  <p className="text-sm font-medium text-slate-300">Generating...</p>
                  <p className="text-xs text-slate-500 text-center max-w-[200px]">
                    Creating your brand asset with AI
                  </p>
                </div>
              ) : generatedImageUrl ? (
                // Generated image preview
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={generatedImageUrl}
                    alt="Generated brand logo"
                    className="max-w-full max-h-full rounded-xl shadow-2xl"
                  />
                </div>
              ) : selectedConcept || customVision.trim() ? (
                // Preview placeholder (ready to generate)
                <div className="flex flex-col items-center gap-4">
                  <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
                    <Sparkles className="h-16 w-16 text-amber-400/50" />
                  </div>
                  <p className="text-sm font-medium text-slate-300 text-center max-w-[200px]">
                    Preview will appear here
                  </p>
                  <p className="text-xs text-slate-500 text-center max-w-[200px]">
                    Click "Generate Brand Asset" to create your logo
                  </p>
                </div>
              ) : (
                // Empty state
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 rounded-xl bg-slate-800/30">
                    <Sparkles className="h-10 w-10 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500 text-center max-w-[200px]">
                    Pick a concept above or describe your own vision to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
