import { cookies } from 'next/headers';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabaseServer';
import { getEffectiveUserIdFromCookieStore } from '@/lib/authServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Playbook from '@/components/dashboard/Playbook';
import LibraryClientSection from '@/components/dashboard/LibraryClientSection';
import LibraryReadySection from '@/components/dashboard/LibraryReadySection';
import TacticsGrid from '@/components/dashboard/TacticsGrid';
import StatusChip from '@/components/ui/StatusChip';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DemoNudge from '@/components/ui/DemoNudge';
import { BookOpen, Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const effectiveUserId = getEffectiveUserIdFromCookieStore(cookieStore, user?.id ?? null);

  if (!effectiveUserId) {
    redirect('/login?returnTo=/dashboard/library');
  }

  const db = user?.id === effectiveUserId ? supabase : createServiceRoleClient();

  // 1. Get user niche from profiles
  const { data: profile } = await db
    .from('profiles')
    .select('niche, profile_image_url')
    .eq('id', effectiveUserId)
    .maybeSingle();

  const userNiche = (profile?.niche || 'content creation').toLowerCase().trim();
  const profileImageUrl = profile?.profile_image_url ?? null;

  // Removed: the creator_tools directory.
  //
  // Two sections ("Recommended for You" and "Trending Now") rendered the
  // same table, which is why the same apps appeared twice on one screen.
  // Underneath, the table was five generic tools seeded twice - CapCut,
  // ChatGPT, Notion, OBS and TradingView - with no niche filtering that
  // worked, so an Elden Ring channel was being recommended stock-charting
  // software. A static list of apps every creator already knows about is
  // not what a YouTube intelligence product is for.

  // 3. Check if user has any saved blueprints
  const { count: blueprintCount } = await db
    .from('saved_blueprints')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', effectiveUserId);

  return (
    <div className="space-y-6">
      {/* Brand Identity */}
      {profileImageUrl && (
        <div className="section-frame p-6">
          <h2 className="section-title mb-4 text-amber-300/90">
            Brand Identity
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0 rounded-2xl border-2 border-amber-500/30 bg-slate-950 p-4">
              <img
                src={profileImageUrl}
                alt="Brand logo"
                className="h-24 w-24 object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-300 mb-2">
                Your brand logo from the Identity flow
              </p>
              <Link
                href={`/api/download-image?url=${encodeURIComponent(profileImageUrl)}`}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-amber-500 bg-amber-500 px-6 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 hover:border-amber-400 transition"
              >
                <Download className="h-5 w-5" />
                Download Logo
              </Link>
            </div>
          </div>
        </div>
      )}

      <DashboardPageHeader
        title="Content Library"
        subtitle={`Personalized for your niche: ${userNiche}`}
        icon={<BookOpen className="h-5 w-5" />}
        actions={<StatusChip variant="live" pulse />}
      />

      {(blueprintCount ?? 0) === 0 && (
        <DemoNudge />
      )}

      {/* Ready to Ship - client section with detail modal and copy */}
      <LibraryReadySection />

      {/* Brainstorm + Script It - Client interactive section */}
      <LibraryClientSection userNiche={userNiche} />

      {/* Viral Playbooks (Tactics Grid) */}
      <TacticsGrid niche={userNiche} />

      {/* Playbook */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Playbook</h2>
          <p className="text-sm text-slate-400">
            Your unified learning center for hooks, scripts, and patterns that actually work.
          </p>
        </div>
        <Playbook />
      </div>

    </div>
  );
}
