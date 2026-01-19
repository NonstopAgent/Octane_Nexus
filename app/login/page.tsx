'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, Lock, Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { isLocalhost, setMockUser, createMockUser, hasMockSession, getMockUser } from '@/lib/mockAuth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/identity';
  
  // Ensure returnTo is never empty or just '/'
  const safeReturnTo = (returnTo && returnTo !== '/' && returnTo !== '') ? returnTo : '/identity';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  // Check if user is already signed in
  useEffect(() => {
    async function checkSession() {
      // Check for mock session on localhost first
      if (isLocalhost() && hasMockSession()) {
        router.push(safeReturnTo);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push(safeReturnTo);
      }
    }
    checkSession();
  }, [router, safeReturnTo]);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check for mock user on localhost first
      if (isLocalhost() && hasMockSession()) {
        const mockUser = getMockUser();
        if (mockUser) {
          router.push(safeReturnTo);
          return;
        }
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        router.push(safeReturnTo);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMagicLinkLoading(true);

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: magicLinkEmail.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
        },
      });

      if (magicLinkError) {
        throw magicLinkError;
      }

      setMagicLinkSent(true);
    } catch (err: any) {
      console.error('Magic link error:', err);
      setError(err.message || 'Failed to send magic link. Please try again.');
    } finally {
      setMagicLinkLoading(false);
    }
  }

  async function handleDeveloperBypass() {
    setError(null);
    setLoading(true);

    try {
      // On localhost, use mock auth
      if (isLocalhost()) {
        const mockUser = createMockUser();
        setMockUser(mockUser);
        router.push(safeReturnTo);
        return;
      }

      // On production, use real Supabase auth with standard email
      const testEmail = 'admin@octanenexus.com';
      const testPassword = 'DevBypass2024!Secure#Test';

      // Try to sign in first
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      let user = signInData?.user;

      // If sign-in fails, try to sign up
      if (signInError || !user) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
        });

        if (signUpError) {
          // If signup fails, user might already exist - try sign in one more time
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });

          if (retryError || !retryData?.user) {
            throw new Error(retryError?.message || 'Failed to sign in with test credentials');
          }

          user = retryData.user;
        } else {
          user = signUpData?.user;
        }
      }

      if (!user) {
        throw new Error('Failed to create or sign in test user');
      }

      // Update profile with vault package - await and verify success
      const { data: profileData, error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: testEmail,
          has_purchased_package: true,
          purchased_package_type: 'vault',
          founder_license: true,
        }, {
          onConflict: 'id',
        })
        .select();

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      // Verify the update was successful
      if (!profileData || profileData.length === 0) {
        console.warn('Profile update returned no data, but continuing...');
      }

      // Add delay to ensure database change has propagated
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Use safe returnTo path
      router.push(safeReturnTo);
    } catch (err: any) {
      console.error('Developer bypass error:', err);
      setError(err.message || 'Developer bypass failed. Please use normal login.');
      setLoading(false);
    }
  }

  async function handleMockLogin() {
    if (!isLocalhost()) return;
    
    setError(null);
    setLoading(true);

    try {
      const mockUser = createMockUser();
      setMockUser(mockUser);
      router.push(safeReturnTo);
    } catch (err: any) {
      console.error('Mock login error:', err);
      setError(err.message || 'Mock login failed.');
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">
              Octane Nexus
            </span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight text-slate-50 md:text-4xl">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-300">
            Sign in to access your creator command center
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl md:p-8">
          {/* Mode Toggle */}
          <div className="mb-6 flex gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('password');
                setError(null);
                setMagicLinkSent(false);
              }}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                mode === 'password'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-transparent text-slate-300 hover:bg-slate-800'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('magic');
                setError(null);
                setMagicLinkSent(false);
              }}
              className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                mode === 'magic'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-transparent text-slate-300 hover:bg-slate-800'
              }`}
            >
              Magic Link
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          {magicLinkSent && (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              Check your email! We sent you a magic link to sign in.
            </div>
          )}

          {/* Password Login */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex min-h-[60px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02] disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60 disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          )}

          {/* Magic Link Login */}
          {mode === 'magic' && (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="magic-email" className="block text-sm font-medium text-slate-200">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="magic-email"
                    type="email"
                    value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={magicLinkLoading || magicLinkSent}
                className="w-full inline-flex min-h-[60px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 hover:scale-[1.02] disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60 disabled:hover:scale-100"
              >
                {magicLinkLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending link...
                  </>
                ) : magicLinkSent ? (
                  'Link Sent!'
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    Send Magic Link
                  </>
                )}
              </button>
            </form>
          )}

          {/* Developer Bypass */}
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
            {isLocalhost() && (
              <button
                type="button"
                onClick={handleMockLogin}
                disabled={loading}
                className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-400 transition-all hover:border-emerald-500 hover:bg-emerald-500/20 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  '🎭 Mock Login (Localhost Only)'
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleDeveloperBypass}
              disabled={loading}
              className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-xs font-medium text-slate-400 transition-all hover:border-slate-600 hover:text-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Bypassing...
                </>
              ) : (
                '🧪 Developer Bypass (Test Mode)'
              )}
            </button>
          </div>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => {
              router.push('/identity');
            }}
            className="font-semibold text-amber-400 hover:text-amber-300 underline"
          >
            Get Started
          </button>
        </p>
      </div>
    </main>
  );
}
