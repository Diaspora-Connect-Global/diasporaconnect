import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT_MS = 9000;
const MAX_BODY_BYTES = 512 * 1024; // 512 KB
// A real browser UA — institutional/WAF-protected sites block non-browser agents.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export type LinkPreviewResponse = {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
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

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', hellip: '…',
};

function decodeHtmlEntities(s: string): string {
  return s
    // Decimal (&#039;) and hex (&#x27;) numeric entities.
    .replace(/&#(\d+);/g, (_, n) => {
      try { return String.fromCodePoint(parseInt(n, 10)); } catch { return _; }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      try { return String.fromCodePoint(parseInt(n, 16)); } catch { return _; }
    })
    // Common named entities.
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/** Extract the inner text of the <title> tag, or null. */
function extractTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : null;
}

/** Extract href from <link rel="image_src" href="..."> (either attribute order). */
function extractLinkImageSrc(html: string): string | null {
  const patterns = [
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
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

  // title: og:title (property or name) → twitter:title → <title>
  const title =
    extractMetaContent(html, [
      { property: 'og:title' },
      { name: 'og:title' },
      { name: 'twitter:title' },
    ]) ?? extractTitleTag(html);
  if (title) result.title = title.length > 200 ? title.slice(0, 197) + '...' : title;

  // description: og:description → twitter:description → meta name=description
  const description = extractMetaContent(html, [
    { property: 'og:description' },
    { name: 'og:description' },
    { name: 'twitter:description' },
    { name: 'description' },
  ]);
  if (description) result.description = description.length > 300 ? description.slice(0, 297) + '...' : description;

  // image: og:image → og:image:url → twitter:image → <link rel=image_src>
  const imageUrl =
    extractMetaContent(html, [
      { property: 'og:image' },
      { name: 'og:image' },
      { property: 'og:image:url' },
      { name: 'twitter:image' },
      { name: 'twitter:image:src' },
    ]) ?? extractLinkImageSrc(html);
  if (imageUrl) result.imageUrl = resolveImageUrl(imageUrl, baseUrl);

  const siteName = extractMetaContent(html, [
    { property: 'og:site_name' },
    { name: 'og:site_name' },
  ]);
  if (siteName) result.siteName = siteName.length > 80 ? siteName.slice(0, 77) + '...' : siteName;

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
      redirect: 'follow',
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
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
