import { Metadata } from 'next';

export const BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://diaspoplug.com').replace(/\/$/, '');
export const SITE_NAME = 'DiaspoPlug';
export const LOCALES = ['en', 'fr', 'de', 'it', 'nl'] as const;

export type SupportedLocale = (typeof LOCALES)[number];

/**
 * Build hreflang alternates for a given path (e.g. "/about").
 * The canonical is SELF-REFERENTIAL per locale — each localized page declares
 * itself canonical, with `languages` cross-linking every locale and `x-default`
 * pointing at English. Passing the wrong (or no) locale makes Google treat the
 * other locales as duplicates of English, so callers should always pass their locale.
 */
export function buildAlternates(path: string, locale: string = 'en') {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = `${BASE}/${l}${path}`;
  }
  languages['x-default'] = `${BASE}/en${path}`;
  return {
    canonical: `${BASE}/${locale}${path}`,
    languages,
  };
}

/** Shared robots directive for public, indexable pages */
export const publicRobots: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
};

/**
 * Robots directive for auth-gated / utility pages. These are now indexable
 * (index, follow) so no page emits `noindex, nofollow`; crawler access to
 * genuinely private paths is still controlled centrally in `app/robots.ts`.
 */
export const privateRobots: Metadata['robots'] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
};

/**
 * Absolute URL of the generated site-wide share card (`[locale]/opengraph-image.tsx`).
 *
 * Pages must reference this EXPLICITLY rather than relying on inheritance: Next's
 * `opengraph-image` file convention only applies to the segment it lives in, so a
 * child route that declares its own `openGraph` gets no image unless it sets one.
 */
export function defaultOgImageUrl(locale: string = 'en') {
  return `${BASE}/${locale}/opengraph-image`;
}

/**
 * Open Graph `images` for a page: the entity's own image (event cover, community
 * banner…) when it has one, otherwise the generated site-wide card. Always emits
 * an image so no share link renders without a preview.
 */
export function ogImages(image: string | null | undefined, alt: string, locale: string = 'en') {
  return { images: [{ url: image || defaultOgImageUrl(locale), width: 1200, height: 630, alt }] };
}

/** Twitter `images` counterpart to `ogImages`, with the same fallback behaviour. */
export function twitterImages(image: string | null | undefined, locale: string = 'en') {
  return { images: [image || defaultOgImageUrl(locale)] };
}

/** Core Organisation JSON-LD — reused across pages */
export const organisationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${BASE}/#organization`,
  name: SITE_NAME,
  alternateName: 'DiaspoPlug',
  url: BASE,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE}/LOGO.svg`,
    width: 230,
    height: 93,
  },
  description:
    'DiaspoPlug is the platform connecting diaspora communities worldwide — enabling members, associations, and vendors to collaborate, discover opportunities, and stay engaged across borders.',
  foundingDate: '2024',
  knowsAbout: [
    'diaspora community networking',
    'cross-border collaboration',
    'diaspora associations',
    'community events',
    'diaspora marketplace',
    'international job opportunities',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@diaspoplug.com',
      availableLanguage: ['English', 'French', 'German', 'Italian', 'Dutch'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'partnerships',
      email: 'partners@diaspoplug.com',
    },
  ],
  sameAs: [
    'https://www.linkedin.com/company/diaspoplug',
    'https://twitter.com/diaspoplug',
    'https://www.facebook.com/diaspoplug',
    'https://www.instagram.com/diaspoplug',
  ],
};

/** WebSite JSON-LD with SearchAction for sitelinks search box */
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  url: BASE,
  name: SITE_NAME,
  description: 'Connecting diaspora communities worldwide.',
  inLanguage: ['en', 'fr', 'de', 'it', 'nl'],
  publisher: { '@id': `${BASE}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE}/en?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};
