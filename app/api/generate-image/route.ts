import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Image generation costs real money per call — never leave this open.
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Initialize OpenAI inside the function to catch initialization errors
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const body = await request.json();
    const { prompt, style } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    // Build polished prompt based on style
    let polishedPrompt = prompt;

    if (style === 'logo') {
      polishedPrompt = `Minimalist vector logo symbol for ${prompt}. Strong, geometric lines. Flat design, single color (dark blue or black). White background. No text. No realistic people. Corporate, masculine, modern aesthetics.`;
    } else if (style === 'banner') {
      polishedPrompt = `A high-quality professional channel banner of ${prompt}, engaging design, modern aesthetic, suitable for social media header, wide format, high resolution, professional quality`;
    } else {
      // Default: assume logo style
      polishedPrompt = `Minimalist vector logo symbol for ${prompt}. Strong, geometric lines. Flat design, single color (dark blue or black). White background. No text. No realistic people. Corporate, masculine, modern aesthetics.`;
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: polishedPrompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    // @ts-expect-error - OpenAI response shape varies by version
    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: imageUrl });
  } catch (error: unknown) {
    console.log('--- OPENAI ERROR ---');
    console.log(error);
    console.log('Key Status:', process.env.OPENAI_API_KEY ? 'Key Exists' : 'Key Missing');
    console.error('--- DETAILED ERROR ---', error);
    const err = error as { status?: number };
    if (err?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    if (err?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
