import { NextRequest, NextResponse } from 'next/server';
import { isAllowedProxyUrl } from '@/lib/security';

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Only allow our Supabase storage URLs. Origin comparison, not a prefix
  // match — a prefix check lets `<project>.supabase.co.attacker.com` through.
  if (!isAllowedProxyUrl(url, supabaseUrl)) {
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
