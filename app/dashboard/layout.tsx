'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle, BookOpen, BarChart3, Settings, MessageCircle, Sparkles, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getMockUser } from '@/lib/mockAuth';
import { getCalibrationLevel } from '@/lib/gemini';

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

        // Check for mock user
        const mockUser = getMockUser();
        if (mockUser) {
          setBrandVision('Building your brand authority');
          setLoading(false);
          return;
        }

        // Otherwise, check Supabase
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

  // Load AI training level (mock reinforcement signal)
  useEffect(() => {
    // Only runs on client
    if (typeof window !== 'undefined') {
      setTrainingLevel(getCalibrationLevel());
    }
  }, []);

  const navItems = [
    { href: '/identity', label: 'Identity', icon: UserCircle, external: false },
    { href: '/dashboard/library', label: 'Library', icon: BookOpen, external: false },
    { href: '/dashboard/chat', label: 'Nexus Chat', icon: MessageCircle, external: false },
    { href: '/dashboard/post-lab', label: 'Post Lab', icon: Sparkles, external: false },
    { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarDays, external: false },
    { href: '/dashboard/monitoring', label: 'Monitoring', icon: BarChart3, external: false },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings, external: false },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard/library') {
      return pathname === '/dashboard/library' || pathname === '/dashboard';
    }
    if (href === '/dashboard/chat') {
      return pathname === '/dashboard/chat';
    }
    if (href === '/dashboard/post-lab') {
      return pathname === '/dashboard/post-lab';
    }
    if (href === '/dashboard/schedule') {
      return pathname === '/dashboard/schedule';
    }
    if (href === '/identity') {
      return pathname?.startsWith('/identity') || false;
    }
    return pathname === href;
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-amber-500">Octane Nexus</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  active
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-amber-400' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Training Status */}
        <div className="p-4 border-t border-slate-900">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-300">
              AI Accuracy: Level {trainingLevel}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between">
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

        {/* Page Content */}
        <main className={`flex-1 overflow-hidden ${pathname === '/dashboard/chat' ? 'p-0' : 'overflow-y-auto p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
