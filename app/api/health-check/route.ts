import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { probeGemini } from '@/lib/geminiModels';

export const dynamic = 'force-dynamic';

type ServiceStatus = { ok: boolean; error?: string; [key: string]: unknown };

/**
 * Health check.
 *
 * History — two competing failure modes, both of which have bitten us:
 *
 *   1. Calling Gemini generateContent on every hit burned the free-tier
 *      daily quota, because Vercel deploy probes and external monitors hit
 *      this route constantly. That took the product out in April 2026.
 *
 *   2. Over-correcting to "just check the env var is non-empty" meant this
 *      endpoint cheerfully reported {"gemini":{"ok":true}} for weeks while
 *      Google had retired the model out from under us and every AI feature
 *      in the app was dead. A health check that cannot fail is not a health
 *      check.
 *
 * The fix is a real round-trip probe that is *cached* (5 min TTL, see
 * lib/geminiModels#probeGemini). Monitoring can poll this every 30 seconds
 * and still cost at most 12 Gemini calls per hour. Pass ?deep=1 to force a
 * fresh probe when you're actively debugging.
 */
export async function GET(req: NextRequest) {
  const results: Record<string, ServiceStatus> = {};
  const force = req.nextUrl.searchParams.get('deep') === '1';

  // 1. Gemini — real round-trip, cached
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    results.gemini = { ok: false, error: 'GEMINI_API_KEY not set' };
  } else if (apiKey.length < 20) {
    results.gemini = { ok: false, error: 'GEMINI_API_KEY looks malformed' };
  } else {
    const probe = await probeGemini(force);
    results.gemini = {
      ok: probe.ok,
      ...(probe.error ? { error: probe.error } : {}),
      model: probe.model,
      checkedAt: probe.checkedAt,
      cached: probe.cached,
    };
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

  // Return a non-200 when something is actually down, so uptime monitors
  // and Vercel deploy checks can fail on it instead of parsing the body.
  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json(
    { ok: allOk, ...results },
    { status: allOk ? 200 : 503 }
  );
}
