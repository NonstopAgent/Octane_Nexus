import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
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
      polishedPrompt = `A high-quality professional vector logo of ${prompt}, clean design, modern aesthetic, suitable for brand identity, vector art style, high resolution, professional quality`;
    } else if (style === 'banner') {
      polishedPrompt = `A high-quality professional channel banner of ${prompt}, engaging design, modern aesthetic, suitable for social media header, wide format, high resolution, professional quality`;
    } else {
      // Default: assume logo style
      polishedPrompt = `A high-quality professional vector logo of ${prompt}, clean design, modern aesthetic, suitable for brand identity, vector art style, high resolution, professional quality`;
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: polishedPrompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    const imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: imageUrl });
  } catch (error: any) {
    console.log('--- OPENAI ERROR ---');
    console.log(error);
    console.log('Key Status:', process.env.OPENAI_API_KEY ? 'Key Exists' : 'Key Missing');
    console.error('--- DETAILED ERROR ---', error);
    
    // Handle OpenAI API errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
