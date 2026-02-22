import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Only allow our Supabase storage URLs
  if (!SUPABASE_URL || !url.startsWith(SUPABASE_URL)) {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 403 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch image');
    const blob = await res.blob();
    const contentType = res.headers.get('content-type') || 'image/png';

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment; filename="brand-logo.png"',
      },
    });
  } catch (error) {
    console.error('download-image error:', error);
    return NextResponse.json({ error: 'Failed to download image' }, { status: 500 });
  }
}
