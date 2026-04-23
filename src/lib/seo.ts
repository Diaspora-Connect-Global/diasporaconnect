import { Metadata } from 'next';

export const BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://diaspoplug.com').replace(/\/$/, '');
export const SITE_NAME = 'DiaspoPlug';
export const LOCALES = ['en', 'fr', 'de', 'it'] as const;

export type SupportedLocale = (typeof LOCALES)[number];

/** Build hreflang alternates for a given path (e.g. "/about") */
export function buildAlternates(path: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${BASE}/${locale}${path}`;
  }
  languages['x-default'] = `${BASE}/en${path}`;
  return {
    canonical: `${BASE}/en${path}`,
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

/** Shared robots directive for auth-gated / private pages */
export const privateRobots: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

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
      availableLanguage: ['English', 'French', 'German', 'Italian'],
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
  inLanguage: ['en', 'fr', 'de', 'it'],
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
