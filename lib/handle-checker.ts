/**
 * Handle Availability Checker
 * Checks if a social media handle is available.
 * Uses RapidAPI when RAPIDAPI_KEY is set; falls back to simulation otherwise.
 */

export type Platform = 'instagram' | 'tiktok' | 'x' | 'youtube';

export type AvailabilityResult = {
  handle: string;
  platform: Platform;
  available: boolean;
  checkedAt: string;
};

const RAPIDAPI_SOCIAL_AVAILABILITY_HOST = 'social-media-availability-api.p.rapidapi.com';

/**
 * Check real availability of a handle on a platform.
 * If RAPIDAPI_KEY exists, fetches from Social Media Availability API.
 * If missing, uses simulation and logs a warning.
 */
export async function checkRealAvailability(
  handle: string,
  platform: Platform
): Promise<AvailabilityResult> {
  const cleanHandle = handle.replace(/^@/, '').trim();
  const apiKey = process.env.RAPIDAPI_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://${RAPIDAPI_SOCIAL_AVAILABILITY_HOST}/check?username=${encodeURIComponent(cleanHandle)}&platform=${platform}`,
        {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': RAPIDAPI_SOCIAL_AVAILABILITY_HOST,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const available = data.available === true || data.available === 'available';

      return {
        handle: `@${cleanHandle}`,
        platform,
        available,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('RapidAPI availability check failed, falling back to simulation:', err);
      return simulateAvailability(cleanHandle, platform);
    }
  }

  if (typeof window !== 'undefined') {
    console.warn(
      '[handle-checker] RAPIDAPI_KEY not set. Using simulation. Add RAPIDAPI_KEY to .env.local for real availability checks.'
    );
  }
  return simulateAvailability(cleanHandle, platform);
}

function simulateAvailability(handle: string, platform: Platform): AvailabilityResult {
  const seed = handle.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const platformOffset = { instagram: 0, tiktok: 1, x: 2, youtube: 3 }[platform];
  const available = (seed + platformOffset) % 3 !== 0;

  return {
    handle: `@${handle}`,
    platform,
    available,
    checkedAt: new Date().toISOString(),
  };
}
