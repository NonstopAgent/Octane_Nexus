import './globals.css';
import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { ActiveLibrarian } from '@/components/ActiveLibrarian';
import { NavigationHeader } from '@/components/NavigationHeader';
import { Toaster } from '@/components/Toaster';

export const metadata = {
  title: 'Octane Nexus',
  description: 'A calm engine for social growth.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-50">
      <body className="h-full bg-slate-950 text-slate-50 antialiased">
        <div className="relative min-h-screen">
          <NavigationHeader />
          {children}
          <Suspense fallback={null}>
            <ActiveLibrarian />
          </Suspense>
        </div>
        <Toaster />
      </body>
    </html>
  );
}

