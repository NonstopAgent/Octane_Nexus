'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Sunrise } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getMockUser, isLocalhost, hasMockSession } from '@/lib/mockAuth';

export function NavigationHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      if (
        typeof document !== 'undefined' &&
        document.cookie.includes('octane_demo_mode=true')
      ) {
        setIsAuthenticated(true);
        return;
      }
      if (isLocalhost() && (hasMockSession() || getMockUser())) {
        setIsAuthenticated(true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 transition-all hover:border-amber-500/60 hover:bg-amber-500/15 md:px-4 md:py-2"
        >
          <Sparkles className="h-4 w-4 text-amber-400 md:h-5 md:w-5" />
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-300 md:text-sm">
            Octane Nexus
          </span>
        </Link>

        {/* Right cluster */}
        <div className="flex items-center gap-2 md:gap-3">
          {isAuthenticated === false ? (
            <>
              {/* How it works — desktop only, to keep mobile clean */}
              <Link
                href="/how-it-works"
                className="hidden items-center justify-center rounded-full px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-amber-400 md:inline-flex"
              >
                How it works
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-400 md:px-4 md:py-2 md:text-sm"
              >
                Sign in
              </Link>
              <Link
                href="/login?view=signup"
                className="inline-flex items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-md transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/50 md:px-4 md:py-2 md:text-sm"
              >
                Start free
              </Link>
            </>
          ) : isAuthenticated === true ? (
            <Link
              href="/dashboard/brief"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-400 md:px-4 md:py-2 md:text-sm"
            >
              <Sunrise className="h-4 w-4" />
              Daily Brief
            </Link>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
