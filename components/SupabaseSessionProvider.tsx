'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import type { ReactNode } from 'react';

export function SupabaseSessionProvider({ children }: { children: ReactNode }) {
  const supabase = createClientComponentClient();
  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  );
}
