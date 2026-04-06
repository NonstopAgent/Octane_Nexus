'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type Platform = 'Instagram' | 'TikTok' | 'X' | 'YouTube';
const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'X', 'YouTube'];

export default function IdentityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [niche, setNiche] = useState('');
  const [vibe, setVibe] = useState('');

  // Check auth and load existing profile data
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
    if (!platform || !niche.trim()) return;
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
        has_purchased_package: true,
        founder_license: true,
      }, { onConflict: 'id' });

      router.push('/dashboard');
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">Quick Setup</span>
        </div>
        <h1 className="text-3xl font-semibold text-slate-50 md:text-4xl">Tell us about your content</h1>
        <p className="text-sm text-slate-400">Three quick questions so we can personalize your experience. Takes 30 seconds.</p>
      </div>

      <div className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8">
        {/* Platform */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">What&apos;s your primary platform?</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${
                  platform === p
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600'
                }`}
              >
                {platform === p && <CheckCircle2 className="mb-1 mx-auto h-4 w-4 text-amber-400" />}
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Niche */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">What do you create content about?</label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g., tech reviews, fitness tips, cooking, personal finance..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Vibe */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">How would you describe your style? <span className="text-slate-500">(optional)</span></label>
          <input
            type="text"
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="e.g., casual and funny, professional, fast-paced, educational..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!platform || !niche.trim() || saving}
          className="w-full inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Setting up...</>
          ) : (
            <><ArrowRight className="h-5 w-5" /> Go to Dashboard</>
          )}
        </button>
      </div>
    </main>
  );
}
