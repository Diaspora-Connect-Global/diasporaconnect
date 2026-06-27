import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  output: 'standalone',
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