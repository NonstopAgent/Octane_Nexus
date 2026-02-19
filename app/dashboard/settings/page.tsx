'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings,
  User,
  Plug,
  CreditCard,
  Code2,
  Instagram,
  Music2,
  Youtube,
  Twitter,
  Loader2,
  Trash2,
  Camera,
  Key,
  Shield,
  Database,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { seedDemoData } from '@/actions/seed-data';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import StyleTokensSection from '@/components/dashboard/StyleTokensSection';
import { getKey, setKey as saveKey } from '@/lib/apiKeys';
import { getDisplayHandle, type PlatformKey } from '@/lib/linkedAccounts';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

type TabId = 'general' | 'integrations' | 'billing' | 'developer' | 'style' | 'demo';

type LinkedAccounts = {
  instagram: string | null;
  tiktok: string | null;
  x: string | null;
  youtube: string | null;
};

const BASE_TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'general', label: 'General', icon: User },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'developer', label: 'Developer', icon: Code2 },
  ...(DEMO_MODE ? [{ id: 'demo' as const, label: 'Demo Data', icon: Database }] : []),
];
const TABS = BASE_TABS;

const PLATFORMS: { key: keyof LinkedAccounts; label: string; Icon: typeof Instagram }[] = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'tiktok', label: 'TikTok', Icon: Music2 },
  { key: 'x', label: 'X', Icon: Twitter },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
];

const TAB_PARAM = 'tab';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedToast, setSeedToast] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccounts>({
    instagram: null,
    tiktok: null,
    x: null,
    youtube: null,
  });
  const [, setFounderLicense] = useState(false);

  const [connectModal, setConnectModal] = useState<keyof LinkedAccounts | null>(null);
  const [connectHandle, setConnectHandle] = useState('');
  const [connectSaving, setConnectSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [, setNameSaving] = useState(false);
  const [developerKeys, setDeveloperKeys] = useState({ rapidApi: '', openai: '', pexels: '' });
  const [developerSaving, setDeveloperSaving] = useState(false);
  const [developerSaved, setDeveloperSaved] = useState(false);
  const [demoSeedLoading, setDemoSeedLoading] = useState(false);
  const [demoResetLoading, setDemoResetLoading] = useState(false);
  const [financeDisclaimerEnabled, setFinanceDisclaimerEnabled] = useState(true);
  const [financeDisclaimerSaving, setFinanceDisclaimerSaving] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get(TAB_PARAM);
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam as TabId);
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_image_url, full_name, linked_accounts, founder_license, finance_disclaimer_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setProfileImageUrl(profile.profile_image_url ?? null);
        setFullName(profile.full_name ?? '');
        setFinanceDisclaimerEnabled(profile.finance_disclaimer_enabled !== false);
        const la = (profile.linked_accounts as LinkedAccounts) || {};
        setLinkedAccounts({
          instagram: la.instagram ?? null,
          tiktok: la.tiktok ?? null,
          x: la.x ?? null,
          youtube: la.youtube ?? null,
        });
        setFounderLicense(Boolean(profile.founder_license));
      }
      setEmail(user.email ?? '');
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDeveloperKeys({
        rapidApi: getKey('rapidapi'),
        openai: getKey('openai'),
        pexels: getKey('pexels'),
      });
    }
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/avatar.${ext}`;

    setAvatarUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('content_uploads')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('content_uploads').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_image_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      setProfileImageUrl(urlData.publicUrl);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSaveName() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setNameSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Name save failed:', err);
    } finally {
      setNameSaving(false);
    }
  }

  async function handleConnect(platform: keyof LinkedAccounts) {
    const handle = connectHandle.trim();
    if (!handle) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const h = handle.startsWith('@') ? handle : `@${handle}`;
    setConnectSaving(true);
    try {
      const updated = { ...linkedAccounts, [platform]: h };
      const { error } = await supabase
        .from('profiles')
        .update({ linked_accounts: updated })
        .eq('id', user.id);

      if (error) throw error;
      setLinkedAccounts(updated);
      setConnectModal(null);
      setConnectHandle('');
    } catch (err) {
      console.error('Connect failed:', err);
    } finally {
      setConnectSaving(false);
    }
  }

  async function handleDisconnect(platform: keyof LinkedAccounts) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updated = { ...linkedAccounts, [platform]: null };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ linked_accounts: updated })
        .eq('id', user.id);

      if (error) throw error;
      setLinkedAccounts(updated);
    } catch (err) {
      console.error('Disconnect failed:', err);
    }
  }

  async function handleSeedDemoData() {
    setSeedLoading(true);
    try {
      const result = await seedDemoData();
      if ('error' in result) {
        setSeedToast(result.error);
      } else {
        setSeedToast(`Factory populated with ${result.count} viral concepts.`);
        router.refresh();
      }
    } catch {
      setSeedToast('Failed to seed demo data.');
    } finally {
      setSeedLoading(false);
      setTimeout(() => setSeedToast(null), 4000);
    }
  }

  async function handleDemoSeed() {
    setDemoSeedLoading(true);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to load demo data');
        return;
      }
      toast.success(`Demo data loaded (${data.count ?? 0} items). Refresh the dashboard to see it.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load demo data');
    } finally {
      setDemoSeedLoading(false);
    }
  }

  async function handleDemoReset() {
    setDemoResetLoading(true);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Failed to reset demo data');
        return;
      }
      toast.success('Demo data reset.');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset demo data');
    } finally {
      setDemoResetLoading(false);
    }
  }

  function handleSaveDeveloperKeys() {
    if (typeof window === 'undefined') return;
    setDeveloperSaving(true);
    if (developerKeys.rapidApi) saveKey('rapidapi', developerKeys.rapidApi);
    if (developerKeys.openai) saveKey('openai', developerKeys.openai);
    if (developerKeys.pexels) saveKey('pexels', developerKeys.pexels);
    setDeveloperSaved(true);
    setTimeout(() => { setDeveloperSaving(false); setDeveloperSaved(false); }, 1500);
  }

  function handleDeleteAccount() {
    if (!confirm('Are you sure? This action cannot be undone.')) return;
    alert('Account deletion would be processed here. Contact support for assistance.');
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Settings"
        subtitle="Manage your account and preferences"
        icon={<Settings className="h-5 w-5" />}
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <nav className="w-full md:w-56 flex-shrink-0">
          <div className="dashboard-card-flat rounded-xl p-2 space-y-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 dashboard-card-flat rounded-xl p-6">
          {activeTab === 'general' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-slate-50 mb-4">Profile</h2>
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800">
                      {profileImageUrl ? (
                        <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-10 w-10 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 rounded-full bg-amber-500 p-2 cursor-pointer hover:bg-amber-400 transition">
                      {avatarUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      ) : (
                        <Camera className="h-4 w-4 text-slate-950" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={avatarUploading}
                      />
                    </label>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        onBlur={handleSaveName}
                        placeholder="Your name"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-500 mt-1">Email cannot be changed here</p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-200">Finance disclaimer reminder (recommended)</p>
                        <p className="text-xs text-slate-500 mt-0.5">Get a reminder in Post Lab to add &quot;Not financial advice&quot; when your niche suggests finance content.</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={financeDisclaimerEnabled}
                        onClick={async () => {
                          const { data: { user: u } } = await supabase.auth.getUser();
                          if (!u) return;
                          setFinanceDisclaimerSaving(true);
                          const next = !financeDisclaimerEnabled;
                          const { error: e } = await supabase.from('profiles').update({ finance_disclaimer_enabled: next }).eq('id', u.id);
                          if (!e) setFinanceDisclaimerEnabled(next);
                          setFinanceDisclaimerSaving(false);
                        }}
                        disabled={financeDisclaimerSaving}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${financeDisclaimerEnabled ? 'bg-amber-500' : 'bg-slate-600'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${financeDisclaimerEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Danger Zone
                </h3>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-50 mb-4">Connected Accounts</h2>
              <div className="grid gap-4">
                {PLATFORMS.map(({ key, label, Icon }) => {
                  const display = getDisplayHandle(linkedAccounts, key as PlatformKey);
                  const connected = display !== 'Not connected';
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-slate-300" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-100">{label}</p>
                          <p className="text-sm text-slate-400">{display}</p>
                        </div>
                      </div>
                      {connected ? (
                        <button
                          type="button"
                          onClick={() => handleDisconnect(key)}
                          className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition"
                        >
                          Disconnect
                        </button>
                      ) : null}
                      {!connected ? (
                        <button
                          type="button"
                          onClick={() => {
                            setConnectModal(key);
                            setConnectHandle('');
                          }}
                          className="rounded-lg border border-amber-500 bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
                        >
                          Connect Account
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-50">Subscription</h2>
              <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-6 max-w-sm">
                <div className="flex items-center justify-between mb-6">
                  <Shield className="h-8 w-8 text-amber-400" />
                  <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                    Founder Plan
                  </span>
                </div>
                <div className="space-y-1 mb-6">
                  <p className="text-2xl font-bold text-slate-50">Lifetime Access</p>
                  <p className="text-sm text-slate-400">Full platform access</p>
                </div>
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-xs text-slate-500">Next Billing Date</p>
                  <p className="text-sm font-medium text-slate-200">Lifetime Access — No renewal</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'developer' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-50">API Keys</h2>
              <p className="text-sm text-slate-400">
                Store API keys locally for handle checking and AI features. Keys are saved in browser storage.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">RapidAPI Key</label>
                  <input
                    type="password"
                    value={developerKeys.rapidApi}
                    onChange={(e) => setDeveloperKeys((k) => ({ ...k, rapidApi: e.target.value }))}
                    placeholder="••••••••••••••••"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">OpenAI Key</label>
                  <input
                    type="password"
                    value={developerKeys.openai}
                    onChange={(e) => setDeveloperKeys((k) => ({ ...k, openai: e.target.value }))}
                    placeholder="••••••••••••••••"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Pexels Key</label>
                  <input
                    type="password"
                    value={developerKeys.pexels}
                    onChange={(e) => setDeveloperKeys((k) => ({ ...k, pexels: e.target.value }))}
                    placeholder="••••••••••••••••"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveDeveloperKeys}
                  disabled={developerSaving}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition"
                >
                  {developerSaved ? (
                    <>
                      <Key className="h-4 w-4" />
                      Saved!
                    </>
                  ) : developerSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      Save to Browser
                    </>
                  )}
                </button>
              </div>

              <div className="pt-8 mt-8 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Developer Zone</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Populate your Production Board with demo content to preview the full flow.
                </p>
                <button
                  type="button"
                  onClick={handleSeedDemoData}
                  disabled={seedLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60 transition"
                >
                  {seedLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Seeding…
                    </>
                  ) : (
                    <>🌱 Seed Demo Data</>
                  )}
                </button>
                {seedToast && (
                  <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200">
                    {seedToast}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'style' && <StyleTokensSection />}

          {DEMO_MODE && activeTab === 'demo' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-50">Demo Data</h2>
              <p className="text-sm text-slate-400">
                Load deterministic demo data so you can test the MVP without connecting real social accounts. Reset removes only demo-seeded data.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDemoSeed}
                  disabled={demoSeedLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 disabled:opacity-60 transition"
                >
                  {demoSeedLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    'Load Demo Data'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDemoReset}
                  disabled={demoResetLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60 transition"
                >
                  {demoResetLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    'Reset Demo Data'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connect Modal */}
      {connectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-lg font-semibold text-slate-50 mb-2">
              Connect {PLATFORMS.find((p) => p.key === connectModal)?.label}
            </h3>
            <p className="text-sm text-slate-400 mb-4">Enter your handle (with or without @)</p>
            <input
              type="text"
              value={connectHandle}
              onChange={(e) => setConnectHandle(e.target.value)}
              placeholder="@username"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleConnect(connectModal)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConnectModal(null)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConnect(connectModal)}
                disabled={connectSaving || !connectHandle.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500 bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
              >
                {connectSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
