import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { ActiveLibrarian } from '@/components/ActiveLibrarian';
import { NavigationHeader } from '@/components/NavigationHeader';
import { SystemStatusBanner } from '@/components/SystemStatusBanner';
import { SupabaseSessionProvider } from '@/components/SupabaseSessionProvider';
import { PostHogProvider } from '@/components/PostHogProvider';

const SITE_URL = 'https://octane-nexus-6em9.vercel.app';
const SITE_NAME = 'Octane Nexus';
const SITE_DESC =
  "The morning intelligence brief for YouTubers. Every morning, wake up to what's blowing up in your niche, patterns from your own channel, and one specific video idea ready to film — 90 minutes of research, done overnight.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Octane Nexus — Your morning brief for YouTube',
    template: '%s · Octane Nexus',
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    'YouTube',
    'creator tools',
    'competitor analysis',
    'channel analytics',
    'YouTube growth',
    'content ideas',
    'daily brief',
  ],
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Octane Nexus — Your morning brief for YouTube',
    description: SITE_DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Octane Nexus — Your morning brief for YouTube',
    description: SITE_DESC,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-950 text-slate-50 antialiased">
        <PostHogProvider>
          <SupabaseSessionProvider>
            <div className="relative min-h-screen">
              <NavigationHeader />
              <SystemStatusBanner />
              {children}
              <Suspense fallback={null}>
                <ActiveLibrarian />
              </Suspense>
            </div>
          </SupabaseSessionProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
