import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

type ServiceStatus = { ok: boolean; error?: string };

export async function GET() {
  const results: Record<string, ServiceStatus> = {};

  // 1. Gemini API
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      results.gemini = { ok: false, error: 'API key not set' };
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent('Hello');
      const text = result.response.text();
      results.gemini = text ? { ok: true } : { ok: false, error: 'Empty response' };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    results.gemini = { ok: false, error: msg };
  }

  // 2. Supabase DB (profiles table - users data; auth.users requires service role)
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

  // 3. Storage (list buckets)
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
