'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { isLocalhost } from '@/lib/mockAuth';

function LoginContent() {
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
  const [googleLoading, setGoogleLoading] = useState(false);

  // ==================== GOOGLE OAUTH (SUPABASE) ====================
  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      // We deliberately do NOT request YouTube scopes here. Supabase Google
      // sign-in only identifies the user. The separate YouTube OAuth flow
      // at /api/auth/youtube/* handles the youtube.readonly consent when
      // the user clicks "Connect YouTube" from the brief page. Bundling
      // both consents into one screen is fragile and tends to break.
      const redirectBase =
        typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${redirectBase}/auth/callback?returnTo=${encodeURIComponent(
        safeReturnTo === '/dashboard' ? '/identity' : safeReturnTo
      )}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) throw oauthError;
      // Successful OAuth redirects the browser; no further state to set.
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start Google sign-in. Try again?'
      );
      setGoogleLoading(false);
    }
  }

  // ==================== MOCK LOGIN (LOCALHOST ONLY) ====================
  async function handleMockLogin() {
    if (!isLocalhost() || process.env.NODE_ENV !== 'development') return;
    
    setError(null);
    setLoading(true);

    try {
      const demoEmail = 'demo@octanenexus.com';
      const demoPassword = 'dev123456';

      const signInResult = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
      let authData = signInResult.data;

      if (signInResult.error) {
        const signUpResult = await supabase.auth.signUp({ email: demoEmail, password: demoPassword });
        if (signUpResult.error) throw signUpResult.error;
        authData = signUpResult.data as typeof signInResult.data;
      }

      if (authData?.user) {
        await supabase.from('profiles').upsert(
          {
            id: authData.user.id,
            has_purchased_package: true,
            founder_license: true,
          },
          { onConflict: 'id' }
        );
        router.push('/identity');
      }
    } catch (err: unknown) {
      console.error('Mock login error:', err);
      setError(err instanceof Error ? err.message : 'Mock login failed.');
    } finally {
      setLoading(false);
    }
  }

  // ==================== REAL LOGIN/SIGNUP (SUPABASE) ====================
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation before hitting the API
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (viewSignup && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

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
          // but honour any explicit returnTo that isn't the generic /dashboard
          const signupDest = (safeReturnTo && safeReturnTo !== '/dashboard') ? safeReturnTo : '/identity';
          router.push(signupDest);
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
          // Use the returnTo param if set, otherwise go to the brief
          router.push(safeReturnTo !== '/dashboard' ? safeReturnTo : '/dashboard/brief');
        }
      }
    } catch (err: unknown) {
      console.error(viewSignup ? 'Signup error:' : 'Login error:', err);
      setError(err instanceof Error ? err.message : (viewSignup ? 'Failed to create account. Please try again.' : 'Failed to sign in. Please check your credentials.'));
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
    } catch (err: unknown) {
      console.error('Magic link error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send magic link. Please try again.');
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
          <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-slate-50 md:text-4xl">
            {viewSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-slate-300">
            {viewSignup
              ? 'Takes about 90 seconds. You\u2019ll connect YouTube right after.'
              : 'Sign in to get to your morning brief.'}
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl md:p-8">
          {/* Google OAuth — primary CTA, filled amber to pull the eye */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="mb-5 w-full inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-base font-semibold text-slate-950 shadow-lg transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/60 disabled:cursor-not-allowed disabled:border-amber-500/60 disabled:bg-amber-500/60"
          >
            {googleLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Opening Google…
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#EA4335" d="M12 11v3.2h5.3c-.2 1.4-1.6 4.1-5.3 4.1-3.2 0-5.8-2.6-5.8-5.9S8.8 6.5 12 6.5c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 4 14.6 3 12 3 6.9 3 2.8 7.1 2.8 12.2S6.9 21.4 12 21.4c6.9 0 9.2-4.8 9.2-7.4 0-.5 0-.9-.1-1.3H12z"/>
                </svg>
                {viewSignup ? 'Continue with Google' : 'Sign in with Google'}
              </>
            )}
          </button>

          {/* Divider */}
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs uppercase tracking-wide text-slate-500">or email</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

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
              Check your email — we sent you a magic link.
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
                className="w-full inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-sm font-semibold text-slate-950 shadow-md transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {viewSignup ? 'Creating account…' : 'Signing in…'}
                  </>
                ) : (
                  <>{viewSignup ? 'Create account' : 'Sign in'}</>
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
                className="w-full inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-8 text-sm font-semibold text-slate-950 shadow-md transition-all hover:border-amber-400 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {magicLinkLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending link…
                  </>
                ) : magicLinkSent ? (
                  'Link sent'
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send magic link
                  </>
                )}
              </button>
            </form>
          )}

          {/* Demo Mode Button - when NEXT_PUBLIC_DEMO_MODE=true */}
          {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  document.cookie = 'octane_demo_mode=true; path=/; max-age=86400';
                  router.push('/dashboard/creator');
                }}
                className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-4 text-sm font-semibold text-amber-400 transition-all hover:border-amber-500 hover:bg-amber-500/20"
              >
                <Zap className="h-4 w-4" />
                Try Demo (No Sign In)
              </button>
            </div>
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
                className="font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <Link
                href="/login?view=signup"
                className="font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                Start free
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-slate-950"><div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /></main>}>
      <LoginContent />
    </Suspense>
  );
}
