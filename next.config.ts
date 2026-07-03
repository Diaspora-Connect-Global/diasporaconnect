import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  output: 'standalone',
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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/diaspoplug-media/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.diaspoplug.net',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);