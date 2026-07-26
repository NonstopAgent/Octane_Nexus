'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle, BookOpen, Settings, MessageCircle, TrendingUp, Sunrise, Mic } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCalibrationLevel } from '@/lib/gemini';
import CreatorDailyBar from '@/components/dashboard/CreatorDailyBar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [brandVision, setBrandVision] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [trainingLevel, setTrainingLevel] = useState<number>(1);

  useEffect(() => {
    async function loadBrandVision() {
      try {
        // First, check localStorage for brand_vision (from Identity flow)
        if (typeof window !== 'undefined') {
          const storedVision = localStorage.getItem('brand_vision');
          if (storedVision && storedVision.trim()) {
            const snippet = storedVision.length > 60
              ? storedVision.substring(0, 57) + '...'
              : storedVision;
            setBrandVision(snippet);
            setLoading(false);
            return;
          }
        }

        // Check Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('brand_vision')
          .eq('id', user.id)
          .single();

        if (profile?.brand_vision) {
          const snippet = profile.brand_vision.length > 60
            ? profile.brand_vision.substring(0, 57) + '...'
            : profile.brand_vision;
          setBrandVision(snippet);
        } else {
          // If no vision found, leave empty (will show "Dashboard" fallback)
          setBrandVision('');
        }
      } catch (error) {
        console.error('Failed to load brand vision:', error);
        // On error, leave empty (will show "Dashboard" fallback)
        setBrandVision('');
      } finally {
        setLoading(false);
      }
    }

    loadBrandVision();
  }, []);

  // Load AI accuracy level from Supabase (persisted across sessions)
  useEffect(() => {
    async function loadAccuracy() {
      const level = await getCalibrationLevel();
      setTrainingLevel(level);
    }
    loadAccuracy();
    const handler = () => { loadAccuracy(); };
    window.addEventListener('calibration-updated', handler);
    return () => window.removeEventListener('calibration-updated', handler);
  }, []);

  // Strategic pivot: Daily Brief is now the morning landing surface.
  // Memory is no longer a destination: capture is automatic and the
  // controls live in Settings. A tab you had to visit and fill in by
  // hand meant nothing ever got remembered.
  // Cut Post Lab, Production, Schedule — they duplicated Notion/ClickUp
  // without adding creator-specific value. Keep the surfaces that feed
  // or consume the Daily Brief: Brief → Chat → Memory → Trends → Library.
  const navItems = [
    { href: '/dashboard/brief', label: 'Daily Brief', icon: Sunrise, external: false },
    { href: '/dashboard/chat', label: 'Nexus Chat', icon: MessageCircle, external: false },
    { href: '/dashboard/hook-lab', label: 'Hook Lab', icon: Mic, external: false },
    { href: '/dashboard/trends', label: 'Trends', icon: TrendingUp, external: false },
    { href: '/dashboard/library', label: 'Library', icon: BookOpen, external: false },
    { href: '/identity', label: 'Identity', icon: UserCircle, external: false },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings, external: false },
  ];

  const isActive = (href: string) => {
    if (href === '/identity') return pathname?.startsWith('/identity') || false;
    if (href === '/dashboard/library') return pathname === '/dashboard/library' || pathname === '/dashboard';
    return pathname === href;
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/90 bg-slate-950 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-slate-800/80">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-amber-500">Octane Nexus</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            const testId = item.href === '/identity' ? 'nav-identity' : item.href.replace('/dashboard/', 'nav-');
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={testId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-950 border-l-2 ${
                  active
                    ? 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20 border-l-amber-500'
                    : 'border-l-transparent text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Training Status */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-300">
              AI Accuracy: Level {trainingLevel}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative dashboard-bg dashboard-bg-noise">
        {/* Header */}
        <header className="relative z-10 h-16 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-sm px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {loading && (
              <div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
            )}
            {!loading && brandVision && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Brand Vision:</span>
                <span className="text-sm text-slate-200">{brandVision}</span>
              </div>
            )}
            {!loading && !brandVision && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-300">Dashboard</span>
              </div>
            )}
          </div>
        </header>

        {/* Creator Daily Bar */}
        <CreatorDailyBar />

        {/* Page Content */}
        <main className={`relative z-10 flex-1 overflow-hidden ${pathname === '/dashboard/chat' ? 'p-0' : 'overflow-y-auto px-6 py-6'}`}>
          <div className={`h-full animate-fade-in ${pathname === '/dashboard/chat' ? '' : 'max-w-6xl mx-auto'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
