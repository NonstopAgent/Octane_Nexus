'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      toastOptions={{
        classNames: {
          toast: 'bg-slate-900 border-slate-700 text-slate-100',
          error: 'bg-rose-950/90 border-rose-700',
        },
      }}
    />
  );
}
