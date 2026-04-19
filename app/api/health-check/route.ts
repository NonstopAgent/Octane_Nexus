import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type ServiceStatus = { ok: boolean; error?: string };

/**
 * Lightweight health check.
 *
 * IMPORTANT: We do NOT make a real Gemini API call from here. Hitting
 * generateContent on every health check — including Vercel's own deploy
 * checks and any external monitoring — will quietly burn through the
 * Gemini free-tier quota (~1500 req/day on 2.0 Flash). That exact bug
 * took us out in April 2026.
 *
 * For Gemini we just confirm the key is configured and non-empty. If
 * you need a true round-trip probe, do it on-demand from a protected
 * admin route, not from an unauthenticated public endpoint.
 */
export async function GET() {
  const results: Record<string, ServiceStatus> = {};

  // 1. Gemini config presence (no network call)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    results.gemini = { ok: false, error: 'GEMINI_API_KEY not set' };
  } else if (apiKey.length < 20) {
    results.gemini = { ok: false, error: 'GEMINI_API_KEY looks malformed' };
  } else {
    results.gemini = { ok: true };
  }

  // 2. Supabase DB
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      results.database = { ok: false, error: 'URL or anon key not set' };
    } else {
      const supabase = createClient(url, key);
      const { error } = await supabase.from('profiles').select('id').limit(1);
      results.database = error ? { ok: false, error: error.message } : { ok: true };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    results.database = { ok: false, error: msg };
  }

  // 3. Storage
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      results.storage = { ok: false, error: 'URL or anon key not set' };
    } else {
      const supabase = createClient(url, key);
      const { error } = await supabase.storage.listBuckets();
      results.storage = error ? { ok: false, error: error.message } : { ok: true };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    results.storage = { ok: false, error: msg };
  }

  return NextResponse.json(results);
}
