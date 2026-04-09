'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-slate-200">
        <h1 className="text-xl font-semibold text-amber-400">Something went wrong</h1>
        <p className="max-w-md text-center text-sm text-slate-400">
          We have been notified. Try again, or return home.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
