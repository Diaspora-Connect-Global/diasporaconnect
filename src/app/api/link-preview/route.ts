import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 256 * 1024; // 256 KB

export type LinkPreviewResponse = {
  title?: string;
  description?: string;
  imageUrl?: string;
};

/** Reject private/localhost URLs to avoid SSRF. */
function isUrlSafeForFetch(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
  // IPv4 private ranges
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = host.match(ipv4);
  if (m) {
    const [, a, b, c] = m.map(Number);
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 0 || a === 127) return false;
  }
  return true;
}

/** Extract content from meta tag: property="og:title" content="..." or name="twitter:title" content="...". */
function extractMetaContent(html: string, keys: { property?: string; name?: string }[]): string | null {
  for (const { property, name } of keys) {
    const patterns = [
      property && new RegExp(`<meta[^>]+property=["']${escapeRe(property)}["'][^>]+content=["']([^"']+)["']`, 'i'),
      property && new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRe(property)}["']`, 'i'),
      name && new RegExp(`<meta[^>]+name=["']${escapeRe(name)}["'][^>]+content=["']([^"']+)["']`, 'i'),
      name && new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapeRe(name)}["']`, 'i'),
    ].filter(Boolean) as RegExp[];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]) return decodeHtmlEntities(match[1].trim());
    }
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function resolveImageUrl(imageUrl: string, baseUrl: string): string {
  const trimmed = imageUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

function parseOgFromHtml(html: string, baseUrl: string): LinkPreviewResponse {
  const result: LinkPreviewResponse = {};
  const title = extractMetaContent(html, [
    { property: 'og:title' },
    { name: 'twitter:title' },
  ]);
  if (title) result.title = title.length > 200 ? title.slice(0, 197) + '...' : title;

  const description = extractMetaContent(html, [
    { property: 'og:description' },
    { name: 'twitter:description' },
  ]);
  if (description) result.description = description.length > 300 ? description.slice(0, 297) + '...' : description;

  const imageUrl = extractMetaContent(html, [
    { property: 'og:image' },
    { name: 'twitter:image' },
  ]);
  if (imageUrl) result.imageUrl = resolveImageUrl(imageUrl, baseUrl);

  return result;
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam?.trim()) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    const raw = urlParam.trim();
    parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Invalid scheme' }, { status: 400 });
  }

  if (!isUrlSafeForFetch(parsed)) {
    return NextResponse.json({ error: 'Url not allowed' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(parseOgFromHtml('', parsed.href), {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
      });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('text/html')) {
      return NextResponse.json(
        {},
        { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
      );
    }

    const buffer = await res.arrayBuffer();
    const bytes = buffer.byteLength;
    const cap = Math.min(bytes, MAX_BODY_BYTES);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const html = decoder.decode(buffer.slice(0, cap));

    const data = parseOgFromHtml(html, parsed.href);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    return NextResponse.json(
      {},
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=86400' } }
    );
  }
}
