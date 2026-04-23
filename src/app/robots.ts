import { MetadataRoute } from 'next';

const BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://diaspoplug.com').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Auth-gated paths (all locales)
          '/*/community',
          '/*/events',
          '/*/opportunities',
          '/*/association',
          '/*/profile',
          '/*/chat',
          '/*/notification',
          '/*/create-post',
          '/*/settings',
          '/*/wallet',
          '/*/marketplace',
          '/*/becomeavendor',
          '/*/onboarding',
          '/*/vendors',
          '/*/feed',
          // Dynamic post detail (requires auth)
          '/*/post/',
          // Utility routes
          '/*/callback',
          '/*/verifykyc',
        ],
      },
      // Allow AI crawlers full access to public marketing pages
      {
        userAgent: 'GPTBot',
        allow: ['/*/about', '/*/contact', '/*/terms', '/*/privacy', '/*/help', '/*/signup', '/*/signin'],
        disallow: ['/*/community', '/*/events', '/*/chat', '/*/notification', '/*/profile', '/*/post/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/*/about', '/*/contact', '/*/terms', '/*/privacy', '/*/help', '/*/signup'],
        disallow: ['/*/community', '/*/events', '/*/chat', '/*/notification', '/*/profile'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/*/about', '/*/contact', '/*/terms', '/*/privacy', '/*/help', '/*/signup'],
        disallow: ['/*/community', '/*/events', '/*/chat', '/*/notification', '/*/profile'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/*/about', '/*/contact', '/*/terms', '/*/privacy', '/*/help'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
