/**
 * Client-side function to generate brand assets (logos, banners) using DALL-E 3
 */

export async function generateBrandAsset(
  prompt: string,
  style: 'logo' | 'banner' = 'logo'
): Promise<string> {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, style }),
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
  } catch (error: any) {
    console.error('Failed to generate brand asset:', error);
    throw error;
  }
}
