'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Users, Sparkles } from 'lucide-react';

export default function NexusPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNiche, setUserNiche] = useState<string | null>(null);

  useEffect(() => {
    async function loadCreators() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Get user's niche
        const { data: profile } = await supabase
          .from('profiles')
          .select('niche')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.niche) {
          setUserNiche(profile.niche);
        }

        // For now, show all creators (in future, filter by niche)
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, email, niche, linked_accounts')
          .neq('id', user.id)
          .limit(20);

        setCreators(allProfiles || []);
      } catch (err) {
        console.error('Error loading creators:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCreators();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-10 text-slate-50">
      <header className="space-y-3">
        <p className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
          The Nexus
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
          Creators in your Niche
        </h1>
        <p className="max-w-2xl text-sm text-slate-300">
          Connect with creators building in similar spaces. Find collaborators, get inspired, and grow together.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <p className="ml-3 text-sm text-slate-300">Loading creators...</p>
        </div>
      ) : creators.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-12 text-center">
          <Users className="mx-auto h-16 w-16 text-slate-600 mb-4" />
          <p className="text-slate-300">No creators found yet.</p>
          <p className="text-sm text-slate-400 mt-2">Be the first in your niche!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <div key={creator.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                  <Sparkles className="h-6 w-6 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{creator.email?.split('@')[0] || 'Creator'}</p>
                  {creator.niche && (
                    <p className="text-xs text-slate-400 truncate">{creator.niche}</p>
                  )}
                </div>
              </div>
              {creator.linked_accounts && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                  {creator.linked_accounts.instagram && (
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-400">IG</span>
                  )}
                  {creator.linked_accounts.tiktok && (
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-400">TT</span>
                  )}
                  {creator.linked_accounts.x && (
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-400">X</span>
                  )}
                  {creator.linked_accounts.youtube && (
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-400">YT</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {userNiche && (
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-300">
            <span className="font-semibold">Your Niche:</span> {userNiche}
          </p>
          <p className="text-xs text-slate-400 mt-1">Filtering coming soon - you&apos;ll see creators in your exact niche.</p>
        </div>
      )}
    </main>
  );
}
