import { redirect } from 'next/navigation';

// The old multi-platform "command center" dashboard has been archived
// (see git history commit c2c07ed3 and prior) as part of the YouTube-only
// Daily Brief pivot. All new and returning users now land on the brief.
// If we need to bring back gamification, streaks, or community features
// later, they should live on sub-routes of /dashboard/brief, not here.

export default function DashboardPage() {
  redirect('/dashboard/brief');
}
