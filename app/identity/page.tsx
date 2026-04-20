'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Sparkles, Youtube } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// YouTube-only onboarding. Pre-pivot this page asked users to pick a
// primary platform (Instagram/TikTok/X/YouTube), but the product only
// works for YouTube right now, so we hardcode it and skip the question.
const PLATFORM = 'YouTube' as const;

export default function IdentityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [niche, setNiche] = useState('');
  const [vibe, setVibe] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login?view=signup&returnTo=/identity');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('niche, vibe, brand_vision')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.niche) setNiche(profile.niche);
        if (profile.vibe) setVibe(profile.vibe);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleSubmit() {
    if (!niche.trim()) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const brandVision = `${niche.trim()}${vibe.trim() ? '. Style: ' + vibe.trim() : ''}`;

      await supabase.from('profiles').upsert({
        id: user.id,
        niche: niche.trim(),
        vibe: vibe.trim() || null,
        brand_vision: brandVision,
        platform: PLATFORM,
        has_purchased_package: true,
        founder_license: true,
      }, { onConflict: 'id' });

      router.push('/dashboard/brief');
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-4 py-12 md:py-16">
      <div className="space-y-4 text-center">
        {/* Progress dots — signed in ✓, niche →, brief next */}
        <div className="flex items-center justify-center gap-1.5" aria-label="Step 2 of 3">
          <span className="h-1.5 w-6 rounded-full bg-amber-500/60" />
          <span className="h-1.5 w-6 rounded-full bg-amber-500" />
          <span className="h-1.5 w-6 rounded-full bg-slate-700" />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Quick setup</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
          Tell us about your channel
        </h1>
        <p className="text-sm text-slate-400">
          Two questions so your first brief actually fits. Takes 20 seconds.
        </p>
      </div>

      <div className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8">
        {/* YouTube confirmation (non-interactive) */}
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <Youtube className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-100">Built for YouTube creators</p>
            <p className="text-xs text-slate-400">
              We&apos;re YouTube-only for now. Multi-platform support comes later.
            </p>
          </div>
        </div>

        {/* Niche */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">What do you make videos about?</label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g., tech reviews, fitness, cooking, personal finance..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Vibe */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">
            How would you describe your style? <span className="text-slate-500">(optional)</span>
          </label>
          <input
            type="text"
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="e.g., casual and funny, professional, fast-paced, educational..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Submit */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!niche.trim() || saving}
            className="w-full inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Setting up…</>
            ) : (
              <>Go to my brief <ArrowRight className="h-5 w-5" /></>
            )}
          </button>
          <p className="text-center text-xs text-slate-500">
            Next: connect YouTube and pick up to 3 competitors.
          </p>
        </div>
      </div>
    </main>
  );
}
