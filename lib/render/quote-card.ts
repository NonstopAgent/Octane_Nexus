/**
 * Server-only: Generate quote card image (1080x1920) from script hook.
 * SVG -> PNG via sharp.
 */

import sharp from 'sharp';

const W = 1080;
const H = 1920;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build SVG string for quote card.
 */
function buildSvg(args: { title: string; hook: string; category: string }): string {
  const { title, hook, category } = args;
  const safeHook = escapeXml(hook || title || 'Ready to go viral.');
  const safeCategory = escapeXml(category || 'fitness');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="540" y="804" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="64" font-weight="700" fill="#f8fafc"
  >${wrapText(safeHook, 28)}</text>
  <text x="540" y="1780" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="20" font-weight="500" fill="#94a3b8"
  >Octane Nexus · ${safeCategory}</text>
</svg>`;
}

/** Split text into lines (max 4, ~28 chars per line). */
function wrapText(text: string, maxChars: number): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line.length + w.length + 1 <= maxChars) {
      line += (line ? ' ' : '') + w;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  const limited = lines.slice(0, 4);
  const lineHeight = 78;
  return limited
    .map((l, i) => `<tspan x="540" dy="${i === 0 ? 0 : lineHeight}">${l}</tspan>`)
    .join('');
}

export async function renderQuoteCardImage(args: {
  title: string;
  hook: string;
  category: string;
}): Promise<{ pngBuffer: Buffer }> {
  const svg = buildSvg(args);
  const pngBuffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();
  return { pngBuffer };
}
