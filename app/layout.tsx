import type { ReactNode } from 'react';
import './globals.css';
import { ActiveLibrarian } from '@/components/ActiveLibrarian';
import { NavigationHeader } from '@/components/NavigationHeader';
import { SystemStatusBanner } from '@/components/SystemStatusBanner';
import { SupabaseSessionProvider } from '@/components/SupabaseSessionProvider';

export const metadata = {
  title: 'Octane Nexus',
  description: 'A calm engine for social growth.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-950 text-slate-50 antialiased">
        <SupabaseSessionProvider>
          <div className="relative min-h-screen">
            <NavigationHeader />
            <SystemStatusBanner />
            {children}
            <ActiveLibrarian />
          </div>
        </SupabaseSessionProvider>
      </body>
    </html>
  );
}

