'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// The Active Librarian: a simple concierge that will later
// remember user progress via Supabase.

type ChatMessage = {
  id: number;
  from: 'user' | 'guide';
  text: string;
};

type ProfileSnapshot = {
  full_name: string | null;
  niche: string | null;
  onboarding_step: number | null;
};

export function ActiveLibrarian() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let isMounted = true;

    async function hydrateFromSupabase() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!isMounted) return;
          setMessages([
            {
              id: 1,
              from: 'guide',
              text: 'Welcome. Tell me what you want to grow, and I will walk with you.',
            },
          ]);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, niche, onboarding_step, streak_count, founder_license, has_purchased_package, purchased_package_type')
          .eq('id', user.id)
          .maybeSingle();

        // Check if user has content history
        let hasContentHistory = false;
        const hasPurchasedPackage = data?.has_purchased_package || false;
        if (hasPurchasedPackage || data?.founder_license) {
          try {
            const { data: contentHistory } = await supabase
              .from('user_content_history')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
            hasContentHistory = !!contentHistory;
          } catch (err) {
            console.error('Error checking content history:', err);
          }
        }

        if (!isMounted) return;

        if (error) {
          console.error('Error loading profile for Active Librarian.', error);
        }

        const snapshot: ProfileSnapshot = {
          full_name: data?.full_name ?? null,
          niche: data?.niche ?? null,
          onboarding_step:
            typeof data?.onboarding_step === 'number'
              ? data.onboarding_step
              : data?.onboarding_step != null
              ? Number(data.onboarding_step) || null
              : null,
        };

        setProfile(snapshot);

        const name = snapshot.full_name || 'there';
        const niche = snapshot.niche || undefined;
        const step = snapshot.onboarding_step;
        const streakCount =
          typeof data?.streak_count === 'number'
            ? data.streak_count
            : data?.streak_count != null
            ? Number(data.streak_count) || 0
            : 0;
        const hasFounderLicense = data?.founder_license || false;
        const justPaid = searchParams?.get('success') === 'true';

        let text =
          'Welcome. Tell me what you want to grow, and I will walk with you.';

        // Check if user just purchased a package
        if (justPaid && hasPurchasedPackage) {
          const packageType = data?.purchased_package_type || 'package';
          if (packageType === 'vault' || hasFounderLicense) {
            text = `Welcome to the inner circle, ${name}. Your brand infrastructure is now unlimited. Let's train your voice in the Library to start.`;
          } else {
            text = `Your identity package is secured, ${name}. Secure your handles in the Identity Sniper to get started.`;
          }
        } else if (!hasPurchasedPackage) {
          // User hasn't purchased package
          text = `Your identity is the foundation${name !== 'there' ? `, ${name}` : ''}. Secure your package to activate my memory.`;
        } else if (hasPurchasedPackage && !hasContentHistory) {
          // User has package but no content history
          const packageType = data?.purchased_package_type || 'package';
          if (packageType === 'vault' || hasFounderLicense) {
            text = `Welcome to the inner circle${name !== 'there' ? `, ${name}` : ''}. To unlock my full memory, paste your best posts into the Brand Voice Training section in your Library.`;
          } else {
            text = `Your identity package is secured${name !== 'there' ? `, ${name}` : ''}. Secure your handles in the Identity Sniper to get started.`;
          }
        } else if (pathname && pathname.startsWith('/dashboard')) {
          let scriptsCount = 0;
          try {
            const { data: scripts, error: scriptsError } = await supabase
              .from('saved_blueprints')
              .select('id')
              .eq('user_id', user.id);

            if (scriptsError) {
              console.error('Error loading script count for Active Librarian.', scriptsError);
            } else if (scripts) {
              scriptsCount = scripts.length;
            }
          } catch (err) {
            console.error('Unexpected error loading script count.', err);
          }

          text = `Great to see you, ${name}! You have ${scriptsCount} scripts ready to film. Which one are we doing today?`;
        } else if (pathname && pathname.startsWith('/identity')) {
          // Context-aware greeting for Identity Sniper
          const hasLinkedAccounts = data?.linked_accounts && typeof data.linked_accounts === 'object';
          const accountCount = hasLinkedAccounts 
            ? Object.values(data.linked_accounts as Record<string, string | null>).filter(Boolean).length
            : 0;
          
          if (accountCount === 0) {
            text = `Hi ${name}! Let's secure your digital identity. Start by checking your ideal handle across TikTok, Instagram, and X.`;
          } else if (accountCount < 3) {
            text = `Nice progress, ${name}! You've secured ${accountCount} handle${accountCount !== 1 ? 's' : ''}. Let's finish the rest and craft your bios.`;
          } else {
            text = `Your identity is locked in, ${name}! Ready to generate professional bios that match your brand?`;
          }
        } else if (pathname && pathname.startsWith('/lab')) {
          // Context-aware greeting for Algorithm Lab
          const packageType = data?.purchased_package_type || 'package';
          const hasVaultAccess = packageType === 'vault' || hasFounderLicense;
          
          if (!hasPurchasedPackage) {
            text = `Hi ${name}! The Algorithm Lab generates unlimited, voice-matched blueprints. Secure your Authority Vault to get started.`;
          } else if (hasVaultAccess) {
            text = `Welcome to the Lab, ${name}! Enter your niche and I'll generate platform-specific scripts trained on your voice.`;
          } else {
            text = `Hey ${name}! The Lab is ready. You can generate 3 free blueprints, or upgrade to the Authority Vault for unlimited access.`;
          }
        } else if (pathname && pathname.startsWith('/library')) {
          // Context-aware greeting for Library
          if (!hasContentHistory) {
            const packageType = data?.purchased_package_type || 'package';
            if (packageType === 'vault' || hasFounderLicense) {
              text = `Welcome to your Library, ${name}. Train your brand voice by pasting your top 3 posts into Brand Voice Training. I'll mimic your successful style in every script.`;
            } else {
              text = `Welcome to your Library, ${name}. Explore the Creator Vault to study top performers, or save your first blueprint from the Lab.`;
            }
          } else {
            text = `Your Library is active, ${name}. I'm learning from your successful posts. Check out the Creator Vault for strategy insights, or review your saved blueprints.`;
          }
        } else if (pathname && pathname.startsWith('/trends')) {
          // Context-aware greeting for Trending Lab
          text = `Welcome to the Trending Lab, ${name}! I'm tracking the hottest hashtags across TikTok, Instagram, and X. Filter by platform or category to find your next viral angle.`;
        } else {
          // Habit advice based on streak
          if (streakCount === 0) {
            text = `Hi ${name}! Ready to start a small win today? Pick one script from your dashboard and film it—even 30 seconds counts.`;
          } else if (streakCount >= 3) {
            text = `You're on a roll, ${name}! Your consistency is building your brand's foundation. Keep it going!`;
          } else if (step === 1) {
            text = `Hi ${name}, I'm ready to help you scout your perfect handle!`;
          } else if (step === 3) {
            text = `Welcome back! Ready to visit the Lab for today's video ideas?`;
          }
        }

        setMessages([
          {
            id: 1,
            from: 'guide',
            text,
          },
        ]);
      } catch (err) {
        console.error('Unexpected error loading profile for Active Librarian.', err);
        if (!isMounted) return;
        setMessages([
          {
            id: 1,
            from: 'guide',
            text: 'Welcome. Tell me what you want to grow, and I will walk with you.',
          },
        ]);
      }
    }

    hydrateFromSupabase();

    return () => {
      isMounted = false;
    };
  }, [pathname, searchParams]);

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const nextId = messages[messages.length - 1]?.id + 1 || 1;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: nextId, from: 'user', text: trimmed },
      {
        id: nextId + 1,
        from: 'guide',
        text: "Got it. I'll use this to shape your journey. For now, keep moving through the steps.",
      },
    ];

    setMessages(nextMessages);
    setInput('');

    // TODO: Save messages and user progress to Supabase.
  }

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-40 flex h-12 min-h-[48px] w-12 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-lg transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        aria-label="Open guide"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat sidebar */}
      <div
        className={`fixed inset-y-0 right-0 z-30 w-full max-w-sm transform bg-slate-900/95 text-slate-50 shadow-xl backdrop-blur transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-amber-400">
              Your Guide
            </p>
            <p className="text-base font-semibold text-slate-50">
              Active Librarian
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className="flex h-10 min-h-[40px] w-10 items-center justify-center rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-label="Close guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(100%-4rem)] flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  msg.from === 'user'
                    ? 'ml-auto bg-amber-500 text-slate-950'
                    : 'mr-auto bg-slate-800 text-slate-50'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-slate-800 bg-slate-900/95 px-4 py-3"
          >
            <label className="sr-only" htmlFor="librarian-input">
              Share what you need help with
            </label>
            <div className="flex items-center gap-2">
              <input
                id="librarian-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tell your guide what you want to build..."
                className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-500 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

