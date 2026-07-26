'use client';

import { useEffect, useState } from 'react';
import { UserCircle, Mail, LogOut, Youtube, Shield, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import MemorySettings from '@/components/dashboard/MemorySettings';
import YouTubeConnection from '@/components/dashboard/YouTubeConnection';
import Link from 'next/link';

type Profile = {
  email: string;
  created_at: string;
  linked_accounts?: Record<string, unknown>;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('linked_accounts')
          .eq('id', user.id)
          .maybeSingle();
        setProfile({
          email: user.email ?? '',
          created_at: user.created_at,
          linked_accounts: data?.linked_accounts ?? {},
        });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch {
      toast.error('Sign out failed. Please try again.');
      setSigningOut(false);
    }
  }


  return (
    <div className="space-y-6 pb-12">
      <DashboardPageHeader
        title="Settings"
        subtitle="Manage your account and connected services."
        icon={<Shield className="h-5 w-5" />}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : (
        <>
          {/* Account info */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <UserCircle className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Account</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                <Mail className="h-4 w-4 flex-shrink-0 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Email address</p>
                  <p className="text-sm font-medium text-slate-200">{profile?.email || '—'}</p>
                </div>
              </div>
              {profile?.created_at && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                  <Shield className="h-4 w-4 flex-shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Member since</p>
                    <p className="text-sm font-medium text-slate-200">
                      {new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connected accounts.
              Uses the real YouTubeConnection component rather than a static
              status row. The previous version could only say "Connected" and
              then punted to the Memory tab for Sync and Disconnect — and that
              tab no longer exists. */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                <Youtube className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-50">Connected accounts</h2>
                <p className="text-xs text-slate-500">
                  YouTube powers your channel patterns and brief personalization.
                </p>
              </div>
            </div>
            <YouTubeConnection />
          </div>

          {/* Plan */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-50">Plan</h2>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-emerald-300">Beta — Free</p>
                <p className="text-xs text-slate-400">All features included. No credit card required.</p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-amber-500/40 hover:text-amber-400"
              >
                View pricing <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <MemorySettings />

          {/* Sign out */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-50">Sign out</h2>
            <p className="mb-4 text-sm text-slate-400">
              You will be redirected to the home page. Your data and settings are saved.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
