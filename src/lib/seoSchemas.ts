/**
 * schema.org JSON-LD builders for the public, indexable detail pages.
 * Each builder returns a plain object rendered via <JsonLd/>. Keep these pure
 * and defensive — entity data comes from the public GraphQL API and fields may
 * be missing. Reference the site Organization via `@id` so Google links the
 * graph together.
 */
import { BASE, SITE_NAME } from './seo';

/** Home → Section → {title} breadcrumb. `section` e.g. { name: 'Events', path: '/events' }. */
export function breadcrumbSchema(
  locale: string,
  section: { name: string; path: string },
  current: { name: string; path: string },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: section.name, item: `${BASE}/${locale}${section.path}` },
      { '@type': 'ListItem', position: 3, name: current.name, item: `${BASE}/${locale}${current.path}` },
    ],
  };
}

type EventForSchema = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  status?: string | null;
  locationType?: string | null;
  locationDetails?: {
    venueName?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    virtualLink?: string | null;
  } | null;
  isPaid?: boolean | null;
  currency?: string | null;
  coverImageUrl?: string | null;
  tickets?: Array<{ priceInCents?: number | null; currency?: string | null }> | null;
};

const ATTENDANCE_MODE: Record<string, string> = {
  physical: 'https://schema.org/OfflineEventAttendanceMode',
  virtual: 'https://schema.org/OnlineEventAttendanceMode',
  hybrid: 'https://schema.org/MixedEventAttendanceMode',
};

export function eventSchema(e: EventForSchema, url: string) {
  const loc = e.locationDetails;
  const mode = ATTENDANCE_MODE[(e.locationType || 'physical').toLowerCase()];

  const location =
    e.locationType === 'virtual'
      ? { '@type': 'VirtualLocation', url: loc?.virtualLink || url }
      : {
          '@type': 'Place',
          name: loc?.venueName || loc?.city || 'Venue',
          address: {
            '@type': 'PostalAddress',
            ...(loc?.address ? { streetAddress: loc.address } : {}),
            ...(loc?.city ? { addressLocality: loc.city } : {}),
            ...(loc?.country ? { addressCountry: loc.country } : {}),
          },
        };

  const ticket = e.tickets?.find((t) => (t?.priceInCents ?? 0) > 0) ?? e.tickets?.[0];
  const priceCents = ticket?.priceInCents ?? 0;
  const offers = e.isPaid
    ? {
        '@type': 'Offer',
        price: (priceCents / 100).toFixed(2),
        priceCurrency: (ticket?.currency || e.currency || 'USD').toUpperCase(),
        availability: 'https://schema.org/InStock',
        url,
      }
    : {
        '@type': 'Offer',
        price: '0',
        priceCurrency: (e.currency || 'USD').toUpperCase(),
        availability: 'https://schema.org/InStock',
        url,
      };

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    ...(e.description ? { description: e.description } : {}),
    startDate: e.startAt,
    ...(e.endAt ? { endDate: e.endAt } : {}),
    eventStatus:
      e.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    ...(mode ? { eventAttendanceMode: mode } : {}),
    location,
    ...(e.coverImageUrl ? { image: [e.coverImageUrl] } : {}),
    offers,
    organizer: { '@id': `${BASE}/#organization` },
    url,
  };
}

type OpportunityForSchema = {
  title: string;
  description?: string | null;
  publishedAt?: string | null;
  deadline?: string | null;
  type?: string | null;
  location?: string | null;
  compensationMin?: number | null;
  compensationMax?: number | null;
  compensationCurrency?: string | null;
  eligibilityRegions?: string[] | null;
  owner?: { name?: string | null } | null;
};

export function jobPostingSchema(o: OpportunityForSchema, url: string) {
  const salary =
    o.compensationMin != null || o.compensationMax != null
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: (o.compensationCurrency || 'USD').toUpperCase(),
            value: {
              '@type': 'QuantitativeValue',
              ...(o.compensationMin != null ? { minValue: o.compensationMin } : {}),
              ...(o.compensationMax != null ? { maxValue: o.compensationMax } : {}),
              unitText: 'YEAR',
            },
          },
        }
      : {};

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: o.title,
    description: o.description || o.title,
    ...(o.publishedAt ? { datePosted: o.publishedAt } : {}),
    ...(o.deadline ? { validThrough: o.deadline } : {}),
    ...(o.type ? { employmentType: o.type.toUpperCase() } : {}),
    hiringOrganization: o.owner?.name
      ? { '@type': 'Organization', name: o.owner.name }
      : { '@id': `${BASE}/#organization` },
    ...(o.location
      ? { jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: o.location } } }
      : {}),
    ...salary,
    url,
  };
}

type OrgForSchema = {
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  memberCount?: number | null;
  createdAt?: string | null;
};

/** Organization + CollectionPage for a community/association detail page. */
export function organizationPageSchema(
  org: OrgForSchema,
  url: string,
  typeLabel: 'Community' | 'Association',
) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: org.name,
      ...(org.description ? { description: org.description } : {}),
      ...(org.avatarUrl ? { logo: org.avatarUrl } : {}),
      ...(org.bannerUrl ? { image: org.bannerUrl } : {}),
      ...(org.createdAt ? { foundingDate: org.createdAt } : {}),
      url,
      parentOrganization: { '@id': `${BASE}/#organization` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${org.name} — ${typeLabel} on ${SITE_NAME}`,
      ...(org.description ? { description: org.description } : {}),
      url,
      isPartOf: { '@id': `${BASE}/#website` },
    },
  ];
}
