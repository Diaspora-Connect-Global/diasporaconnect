import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Hosts the app legitimately talks to. Kept beside the CSP so the two cannot
// drift apart when a new backend or CDN is introduced.
const API_HOST = 'https://api.diaspoplug.net';
const WS_HOST = 'wss://api.diaspoplug.net';
const CDN_HOSTS = ['https://cdn.diaspoplug.net', 'https://storage.googleapis.com'];
const ASSET_HOST = process.env.ASSET_PREFIX || '';

/**
 * Content Security Policy.
 *
 * Shipped in Report-Only mode: a blocking CSP on a Next.js app is a breaking
 * change (framework inline bootstrap scripts, styled-jsx, third-party embeds),
 * so violations are reported first and the policy is promoted to enforcing
 * `Content-Security-Policy` once the reports come back clean.
 *
 * `unsafe-inline`/`unsafe-eval` on script-src are what Next's inline bootstrap
 * requires without a nonce; tightening that needs a nonce-based middleware and
 * is deliberately out of scope here.
 */
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${ASSET_HOST}`,
  `style-src 'self' 'unsafe-inline' ${ASSET_HOST}`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data: ${ASSET_HOST}`,
  `connect-src 'self' ${API_HOST} ${WS_HOST} ${CDN_HOSTS.join(' ')} ${ASSET_HOST}`,
  `media-src 'self' blob: ${CDN_HOSTS.join(' ')}`,
  `worker-src 'self' blob:`,
  `frame-ancestors 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
]
  .map((d) => d.replace(/\s+/g, ' ').trim())
  .join('; ');

const securityHeaders = [
  // Force HTTPS for two years, including subdomains, and allow preload-list inclusion.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Stop browsers guessing a response's type (MIME-confusion / drive-by XSS).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Clickjacking protection for legacy browsers; frame-ancestors covers modern ones.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Send only the origin cross-site, never the full path/query.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app requests none of these; deny them outright.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  // Explicitly off: the legacy auditor is itself an XSS vector on old browsers.
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  // Do not advertise the framework — one less fingerprinting signal.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Serve Next's build assets (_next/static: JS/CSS/chunks) from a CDN when
  // ASSET_PREFIX is set at build time — e.g. https://static.diaspoplug.net, a
  // Cloudflare-proxied host whose origin is this Cloud Run service and which
  // edge-caches /_next/static/* (already emitted with `immutable, max-age=1yr`).
  // Empty/undefined → assets are served from the app origin exactly as today
  // (safe default). MUST be a full absolute URL and MUST actually proxy the
  // origin's /_next/* paths, or asset loading will 404.
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  async redirects() {
    return [
      // "login" is not a user id — avoid matching [id] profile route; real auth is /signin
      { source: '/login', destination: '/en/signin', permanent: false },
      { source: '/:locale/login', destination: '/:locale/signin', permanent: false },
      { source: '/:locale/communitys/:id', destination: '/:locale/community/:id', permanent: true },
      { source: '/:locale/associations/:id', destination: '/:locale/association/:id', permanent: true },
    ];
  },
  images: {
    // Only hosts the app actually renders through next/image. A wildcard here
    // ('**', and especially over plain http) turns /_next/image into an open
    // proxy that will fetch and re-serve any URL on the internet from this
    // origin — which, combined with dangerouslyAllowSVG below, means serving
    // attacker-controlled SVG (and therefore script) as first-party content.
    //
    // Note this constrains next/image ONLY. Plain <img> bypasses the optimizer,
    // so link previews and YouTube thumbnails (arbitrary external hosts, via
    // <img> in LinkPreviewCard) are unaffected and need no entry here.
    remotePatterns: [
      // Stored media, and its pre-CDN GCS origin — toCdnUrl() is a no-op when
      // NEXT_PUBLIC_CDN_URL is unset, and raw GCS URLs persist in stored rows.
      { protocol: 'https', hostname: 'cdn.diaspoplug.net' },
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/diaspoplug-media/**' },
      // Country-select flags (components/custom/input.tsx).
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
    ],
    // Required: local /public/*.svg (logos, nav and action icons) still routes
    // through /_next/image, which 400s on image/svg+xml without this. No REMOTE
    // svg is ever rendered via next/image, so with the wildcards gone this only
    // ever applies to first-party assets.
    dangerouslyAllowSVG: true,
    // Defence in depth for whatever the optimizer does serve.
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);