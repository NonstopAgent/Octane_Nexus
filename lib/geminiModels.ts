/**
 * Central Gemini model resolution with automatic fallback.
 *
 * WHY THIS EXISTS
 * ---------------
 * Google has now retired a model family out from under this app three times:
 *
 *   - gemini-1.5-*        -> 404 "model is not found"
 *   - gemini-2.0-flash    -> 429 RESOURCE_EXHAUSTED for newer keys
 *   - gemini-2.5-flash    -> 404 "no longer available" starting 2026-07-09,
 *                            three months ahead of Google's own published
 *                            2026-10-16 shutdown date.
 *
 * Each time, every call site was hardcoded to a single model string, so a
 * retirement on Google's side took the entire product down silently and the
 * fix was a 19-file find-and-replace.
 *
 * This module makes that a non-event. Callers ask for a capability, not a
 * model name. If the preferred model is retired, we transparently fall to the
 * next one in the chain and remember the winner for the rest of the runtime.
 *
 * To pin a specific model without a code change, set GEMINI_MODEL in the
 * environment. It is tried first.
 */

/** Ordered fallback chain, newest first. */
const DEFAULT_MODEL_CHAIN = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

/**
 * Error signatures that mean "this model is gone, try another one".
 * Distinct from quota/auth errors, which mean "stop, retrying won't help".
 */
const RETIREMENT_SIGNATURES = [
  /no longer available/i,
  /is not found/i,
  /not found for api version/i,
  /has been deprecated/i,
  /is not supported/i,
];

/**
 * Error signatures that mean the key itself is the problem. Falling through
 * the whole chain on these just burns latency and quota on every request.
 */
const FATAL_SIGNATURES = [
  /api key not valid/i,
  /api key expired/i,
  /permission denied/i,
  /billing/i,
];

export interface GeminiCallResult {
  ok: boolean;
  /** Parsed JSON response body on success. */
  data: unknown;
  /** Human-readable error, null on success. */
  error: string | null;
  /** HTTP status of the final attempt. */
  status: number;
  /** The model that actually served the request (or was tried last). */
  model: string | null;
  /** True when every model in the chain reported itself retired. */
  allModelsRetired: boolean;
}

/** Models confirmed dead this runtime, so we stop paying to rediscover it. */
const retiredModels = new Set<string>();

/** Last model known to work, so healthy requests go straight to it. */
let cachedWorkingModel: string | null = null;

export function getModelChain(preferred?: string): string[] {
  const envPin = process.env.GEMINI_MODEL?.trim();
  const ordered = [
    cachedWorkingModel,
    preferred,
    envPin,
    ...DEFAULT_MODEL_CHAIN,
  ].filter((m): m is string => Boolean(m));

  // Dedupe, preserving order, and drop anything already known to be retired.
  return [...new Set(ordered)].filter((m) => !retiredModels.has(m));
}

function matches(patterns: RegExp[], message: string): boolean {
  return patterns.some((p) => p.test(message));
}

/**
 * Force `thinkingBudget: 0` unless the caller explicitly set one.
 *
 * Gemini 2.5+ are "thinking" models: they spend hidden reasoning tokens out of
 * the same maxOutputTokens budget before emitting a single visible character.
 * For JSON generation and short copy we never want that — it silently starves
 * the real output and produces empty responses that fail JSON.parse.
 */
function withThinkingDisabled(requestBody: Record<string, unknown>) {
  const body = { ...requestBody } as Record<string, unknown>;
  const generationConfig = (body.generationConfig || {}) as Record<string, unknown>;
  const thinkingConfig = (generationConfig.thinkingConfig || {}) as Record<string, unknown>;

  body.generationConfig = {
    ...generationConfig,
    thinkingConfig: {
      ...thinkingConfig,
      thinkingBudget: thinkingConfig.thinkingBudget ?? 0,
    },
  };

  return body;
}

/**
 * Call Gemini, walking the fallback chain until one model answers.
 *
 * Never throws. Inspect `.ok` and `.error`.
 */
export async function callGeminiModel(
  apiKey: string,
  requestBody: Record<string, unknown>,
  options: { preferredModel?: string; timeoutMs?: number } = {}
): Promise<GeminiCallResult> {
  const { preferredModel, timeoutMs = 55_000 } = options;

  if (!apiKey) {
    return {
      ok: false,
      data: null,
      error: 'GEMINI_API_KEY is not set',
      status: 0,
      model: null,
      allModelsRetired: false,
    };
  }

  const chain = getModelChain(preferredModel);
  if (chain.length === 0) {
    return {
      ok: false,
      data: null,
      error:
        'Every known Gemini model has been retired. Set GEMINI_MODEL to a current model name.',
      status: 404,
      model: null,
      allModelsRetired: true,
    };
  }

  const body = withThinkingDisabled(requestBody);
  let lastError = 'Unknown error';
  let lastStatus = 0;
  let lastModel: string | null = null;
  let retiredCount = 0;

  for (const model of chain) {
    lastModel = model;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (cachedWorkingModel !== model) {
          cachedWorkingModel = model;
          console.info(`[gemini] using model: ${model}`);
        }
        return {
          ok: true,
          data,
          error: null,
          status: response.status,
          model,
          allModelsRetired: false,
        };
      }

      const errorText = await response.text();
      let message = errorText;
      try {
        message = JSON.parse(errorText)?.error?.message || errorText;
      } catch {
        /* keep raw text */
      }

      lastStatus = response.status;
      lastError = message;

      if (matches(FATAL_SIGNATURES, message)) {
        console.error(`[gemini] fatal key error on ${model}: ${message}`);
        return {
          ok: false,
          data: null,
          error: message,
          status: response.status,
          model,
          allModelsRetired: false,
        };
      }

      if (response.status === 404 && matches(RETIREMENT_SIGNATURES, message)) {
        retiredModels.add(model);
        retiredCount += 1;
        if (cachedWorkingModel === model) cachedWorkingModel = null;
        console.warn(`[gemini] model ${model} is retired, falling through: ${message}`);
        continue;
      }

      // 429 / 5xx: this model is alive but unavailable right now. Try the
      // next one rather than failing the user's request outright.
      if (response.status === 429 || response.status >= 500) {
        console.warn(`[gemini] ${model} unavailable (${response.status}), trying next model`);
        continue;
      }

      // 400 and friends: our request is malformed. Another model won't help.
      console.error(`[gemini] request rejected by ${model} (${response.status}): ${message}`);
      return {
        ok: false,
        data: null,
        error: message,
        status: response.status,
        model,
        allModelsRetired: false,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.name === 'AbortError'
            ? `Timed out after ${timeoutMs}ms`
            : error.message
          : 'Unknown network error';
      lastError = message;
      console.warn(`[gemini] network failure on ${model}: ${message}`);
      continue;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    ok: false,
    data: null,
    error: lastError,
    status: lastStatus,
    model: lastModel,
    allModelsRetired: retiredCount === chain.length && retiredCount > 0,
  };
}

/**
 * Cheap liveness probe for the health check: does *any* model in the chain
 * actually answer with this key? Result is cached so monitoring can poll
 * without burning the free-tier quota.
 */
let probeCache: { at: number; result: GeminiProbeResult } | null = null;
const PROBE_TTL_MS = 5 * 60 * 1000;

export interface GeminiProbeResult {
  ok: boolean;
  model: string | null;
  error: string | null;
  checkedAt: string;
  cached: boolean;
}

export async function probeGemini(force = false): Promise<GeminiProbeResult> {
  const now = Date.now();
  if (!force && probeCache && now - probeCache.at < PROBE_TTL_MS) {
    return { ...probeCache.result, cached: true };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const result: GeminiProbeResult = {
      ok: false,
      model: null,
      error: 'GEMINI_API_KEY is not set',
      checkedAt: new Date().toISOString(),
      cached: false,
    };
    probeCache = { at: now, result };
    return result;
  }

  const response = await callGeminiModel(
    apiKey,
    {
      contents: [{ parts: [{ text: 'Reply with the single word: OK' }] }],
      generationConfig: { maxOutputTokens: 8, temperature: 0 },
    },
    { timeoutMs: 10_000 }
  );

  const result: GeminiProbeResult = {
    ok: response.ok,
    model: response.model,
    error: response.error,
    checkedAt: new Date().toISOString(),
    cached: false,
  };
  probeCache = { at: now, result };
  return result;
}

/**
 * Pull the first text part out of a generateContent response.
 *
 * Every call site was reaching through `data?.candidates?.[0]?.content?.
 * parts?.[0]?.text` with an `as any` cast, which the repo's eslint config
 * rejects as an error (and which has broken Vercel builds before). One typed
 * accessor instead.
 */
interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
}

export function extractGeminiText(data: unknown): string {
  const response = data as GeminiGenerateContentResponse | null | undefined;
  return response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/** Exposed for tests and diagnostics. */
export function _resetGeminiModelState() {
  retiredModels.clear();
  cachedWorkingModel = null;
  probeCache = null;
}
