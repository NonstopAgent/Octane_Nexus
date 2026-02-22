/**
 * Client-side function to generate brand assets (logos, banners) using DALL-E 3
 * This function calls the secure backend API route at /api/generate-image
 */

/** Fallback shield icon when logo generation fails (inline SVG, no CDN dependency) */
const LOGO_FALLBACK_URL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231e3a5f"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>'
  );

/**
 * Strict Professional Prompt Formula for logos.
 * Produces clean vector-style symbols without text or realistic people.
 */
function buildLogoPrompt(niche: string): string {
  return `Minimalist vector logo symbol for ${niche}. Strong, geometric lines. Flat design, single color (dark blue or black). White background. No text. No realistic people. Corporate, masculine, modern aesthetics.`;
}

/**
 * Generate a professional logo for a given niche.
 * Uses a strict vector-style prompt to avoid nonsense or creepy images.
 * Returns a fallback shield icon URL if generation fails.
 */
export async function generateLogo(niche: string): Promise<string> {
  try {
    const prompt = buildLogoPrompt(niche);
    return await generateBrandAsset(prompt, 'logo');
  } catch (error) {
    console.error('Logo generation failed, using fallback:', error);
    return LOGO_FALLBACK_URL;
  }
}

export async function generateBrandAsset(
  prompt: string,
  type: 'logo' | 'banner' = 'logo'
): Promise<string> {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, style: type }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (!data.url) {
    throw new Error('No image URL returned from API');
  }

  return data.url;
}
