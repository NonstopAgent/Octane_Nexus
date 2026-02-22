import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const keyLoaded = !!apiKey;
    const keyLength = apiKey ? apiKey.length : 0;

    return NextResponse.json({
      status: 'Check',
      keyLoaded,
      keyLength,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: 'Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
