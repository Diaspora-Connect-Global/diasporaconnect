import { MetadataRoute } from 'next';

const BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://diaspoplug.com').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Public read-only DETAIL pages are explicitly allowed; their list/index
        // pages stay auth-gated. Longest-match wins, so "/*/events/" (detail)
        // overrides the broader "/*/events" disallow (list) below.
        allow: [
          '/',
          '/*/events/',
          '/*/opportunities/',
          '/*/community/',
          '/*/association/',
        ],
        disallow: [
          // Authenticated home feed (the public landing lives at "/")
          '/*/home',
          // Auth-gated list/index paths (all locales). Detail pages are allowed above.
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
        allow: ['/*/about', '/*/contact', '/*/terms', '/*/privacy', '/*/help', '/*/signup', '/*/signin', '/*/events/', '/*/opportunities/', '/*/community/', '/*/association/'],
        disallow: ['/*/community', '/*/events', '/*/chat', '/*/notification', '/*/profile', '/*/post/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/*/about', '/*/contact', '/*/terms', '/*/privacy', '/*/help', '/*/signup', '/*/events/', '/*/opportunities/', '/*/community/', '/*/association/'],
        disallow: ['/*/community', '/*/events', '/*/chat', '/*/notification', '/*/profile'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/*/about', '/*/contact', '/*/terms', '/*/privacy', '/*/help', '/*/signup', '/*/events/', '/*/opportunities/', '/*/community/', '/*/association/'],
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
