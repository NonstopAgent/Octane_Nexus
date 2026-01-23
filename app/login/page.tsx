'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { isLocalhost, setMockUser, createMockUser } from '@/lib/mockAuth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/dashboard';
  const viewSignup = searchParams?.get('view') === 'signup';
  
  // Ensure returnTo is valid
  const safeReturnTo = (returnTo && returnTo !== '/' && returnTo !== '') ? returnTo : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  // ==================== MOCK LOGIN (LOCALHOST ONLY) ====================
  async function handleMockLogin() {
    if (!isLocalhost() || process.env.NODE_ENV !== 'development') return;
    
    setError(null);
    setLoading(true);

    try {
      // Use fixed credentials
      const mockUser: ReturnType<typeof createMockUser> = {
        id: 'dev_admin',
        email: 'admin@octanenexus.com',
        has_purchased_package: true,
        purchased_package_type: 'vault',
        founder_license: true,
      };
      
      // Set mock cookie
      setMockUser(mockUser);
      
      // Redirect immediately to Identity onboarding flow
      router.push('/identity');
    } catch (err: any) {
      console.error('Mock login error:', err);
      setError(err.message || 'Mock login failed.');
      setLoading(false);
    }
  }

  // ==================== REAL LOGIN/SIGNUP (SUPABASE) ====================
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (viewSignup) {
        // Sign Up Flow
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        if (data.user) {
          // After successful signup, redirect to /identity for onboarding
          router.push('/identity');
        }
      } else {
        // Sign In Flow
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
      }
    } catch (err: any) {
      console.error(viewSignup ? 'Signup error:' : 'Login error:', err);
      setError(err.message || (viewSignup ? 'Failed to create account. Please try again.' : 'Failed to sign in. Please check your credentials.'));
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
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
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
            {viewSignup ? 'Create your Account' : 'Welcome Back'}
          </h1>
          <p className="text-sm text-slate-300">
            {viewSignup ? 'Get started with Octane Nexus and build your creator identity' : 'Sign in to access your creator command center'}
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

          {/* Error Alert */}
          {error && (
            <div className="mb-4 rounded-xl border-2 border-rose-500/60 bg-rose-500/20 px-4 py-3 text-sm font-medium text-rose-100 shadow-lg">
              {error}
            </div>
          )}

          {/* Success Message */}
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
                    {viewSignup ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    {viewSignup ? 'Create Account' : 'Sign In'}
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

          {/* Mock Login Button (Development Only) */}
          {process.env.NODE_ENV === 'development' && isLocalhost() && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={handleMockLogin}
                disabled={loading}
                className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-400 transition-all hover:border-emerald-500 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    🎭 Mock Login (Dev)
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sign Up / Sign In Toggle Link */}
        <p className="text-center text-sm text-slate-400">
          {viewSignup ? (
            <>
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-amber-400 hover:text-amber-300 underline"
              >
                Sign In
              </Link>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <Link
                href="/login?view=signup"
                className="font-semibold text-amber-400 hover:text-amber-300 underline"
              >
                Get Started
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
