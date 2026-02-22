'use client';

import { useState, useEffect } from 'react';
import { Flame, Zap, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const LEVEL_NAMES: Record<number, string> = {
  1: 'New Creator',
  2: 'Rookie Creator',
  3: 'Rising Creator',
  4: 'Pro Creator',
  5: 'Viral Creator',
};

const XP_PER_LEVEL = 200;

export default function CommandCenter() {
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastPostDate, setLastPostDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_count, last_post_date')
        .eq('id', user.id)
        .maybeSingle();

      const s = typeof profile?.streak_count === 'number' ? profile.streak_count : 0;
      setStreak(Math.max(0, s));
      setLastPostDate(profile?.last_post_date ?? null);

      // Derive XP from streak + mock base (could come from DB later)
      const baseXp = 150;
      const streakXp = s * 25;
      const totalXp = baseXp + streakXp;
      setXp(totalXp);

      const lvl = Math.floor(totalXp / XP_PER_LEVEL) + 1;
      setLevel(Math.min(lvl, 5));
      setLoading(false);
    }
    load();
  }, []);

  /** Used when completing actions to grant XP; kept for future use. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function addXp(amount: number) {
    setXp((prev) => prev + amount);
    setXpToast(amount);
    setTimeout(() => setXpToast(null), 2000);
    const newTotal = xp + amount;
    const newLevel = Math.floor(newTotal / XP_PER_LEVEL) + 1;
    if (newLevel > level) setLevel(Math.min(newLevel, 5));
  }

  const xpInCurrentLevel = xp % XP_PER_LEVEL;
  const progressPercent = (xpInCurrentLevel / XP_PER_LEVEL) * 100;

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h2 className="text-lg font-semibold text-slate-50">Command Center</h2>
      </div>

      <div className="space-y-4">
        {/* Creator Level */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">
              Level {level}: {LEVEL_NAMES[level] ?? 'Creator'}
            </span>
            <span className="text-xs text-amber-400">{xp} XP</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* XP Toast */}
        {xpToast !== null && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-400 animate-pulse">
            <Zap className="inline h-4 w-4 mr-1.5" />
            +{xpToast} XP
          </div>
        )}

        {/* Streak */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <Flame className="h-6 w-6 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-slate-100">{streak} day streak</p>
            <p className="text-xs text-slate-500">
              {lastPostDate ? `Last post: ${new Date(lastPostDate).toLocaleDateString()}` : 'No posts yet'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
