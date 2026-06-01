import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT_MS = 15000;
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB cap

/** Only proxy files from our own GCS media storage (prevents an open proxy / SSRF). */
function isAllowedHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === 'storage.googleapis.com' || host.endsWith('.storage.googleapis.com');
}

/**
 * Streams a document from GCS through the same origin so client-side viewers
 * (pdf.js) can fetch the bytes without cross-origin/CORS restrictions.
 * GET /api/file-proxy?url=<encoded public GCS url>
 */
export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam?.trim()) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam.trim());
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' || !isAllowedHost(parsed)) {
    return NextResponse.json({ error: 'Url not allowed' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(parsed.href, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timeoutId);

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }

    const len = Number(upstream.headers.get('content-length') ?? '0');
    if (len && len > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    clearTimeout(timeoutId);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
  }
}
