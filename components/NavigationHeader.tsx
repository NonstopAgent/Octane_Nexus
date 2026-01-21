'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getMockUser, isLocalhost, hasMockSession } from '@/lib/mockAuth';

export function NavigationHeader() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      // Check for mock user first
      if (isLocalhost() && (hasMockSession() || getMockUser())) {
        setIsAuthenticated(true);
        return;
      }

      // Check for real Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    }

    checkAuth();
  }, []);


  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 transition-all hover:border-amber-500/60 hover:bg-amber-500/15"
        >
          <Sparkles className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-semibold uppercase tracking-wide text-amber-300">
            Octane Nexus
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-3">
          {isAuthenticated === false ? (
            // Logged Out: Show Sign In and Get Started
            <>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-400"
              >
                Sign In
              </Link>
              <Link
                href="/login?view=signup"
                className="inline-flex items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/50"
              >
                Get Started
              </Link>
            </>
          ) : isAuthenticated === true ? (
            // Logged In: Show Command Center only
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:border-amber-500/50 hover:bg-slate-800 hover:text-amber-400"
            >
              <LayoutDashboard className="h-4 w-4" />
              Command Center
            </Link>
          ) : (
            // Loading state: Show nothing or loading indicator
            null
          )}
        </div>
      </nav>
    </header>
  );
}
