import type { Metadata } from 'next';
import JsonLd from '@/components/seo/JsonLd';
import { BASE, SITE_NAME, buildAlternates, publicRobots, privateRobots } from '@/lib/seo';
import { seoGraphQL, truncate, plainText } from '@/lib/seoFetch';
import { eventSchema, breadcrumbSchema } from '@/lib/seoSchemas';
import EventDetailClient from './EventDetailClient';

const DEFAULT_IMAGE = '/og-default.png';

const EVENT_SEO_QUERY = `
  query EventSeo($id: ID!) {
    getEvent(id: $id) {
      id
      title
      description
      status
      visibility
      startAt
      endAt
      locationType
      locationDetails { venueName address city country virtualLink }
      isPaid
      currency
      coverImageUrl
      tickets { priceInCents currency }
    }
  }
`;

type SeoEvent = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  visibility?: string | null;
  startAt: string;
  endAt?: string | null;
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

/**
 * Fetch a PUBLIC event for SEO. Returns null for anything an anonymous visitor
 * shouldn't index (missing, draft, or non-public). The anonymous `getEvent`
 * resolver already enforces this server-side; we double-check here so private
 * content never produces indexable metadata.
 *
 * NOTE: a null result does NOT mean the page 404s — the interactive client
 * island below still renders and fetches with the viewer's own session, so an
 * event owner can still see their draft. Null only means "don't add SEO".
 */
async function fetchPublicEvent(id: string, revalidate = 300): Promise<SeoEvent | null> {
  const data = await seoGraphQL<{ getEvent: SeoEvent | null }>(EVENT_SEO_QUERY, { id }, revalidate);
  const event = data?.getEvent ?? null;
  if (!event) return null;
  if (event.status && event.status.toLowerCase() !== 'published') return null;
  if (event.visibility && event.visibility.toLowerCase() !== 'public') return null;
  return event;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const event = await fetchPublicEvent(id);
  const path = `/events/${id}`;

  if (!event) {
    return { title: 'Event', robots: privateRobots, alternates: buildAlternates(path, locale) };
  }

  const title = truncate(event.title, 70);
  const description =
    truncate(plainText(event.description), 160) || `Discover this event on ${SITE_NAME}.`;
  const image = event.coverImageUrl || DEFAULT_IMAGE;

  return {
    title,
    description,
    robots: publicRobots,
    alternates: buildAlternates(path, locale),
    openGraph: {
      title,
      description,
      url: `${BASE}/${locale}${path}`,
      siteName: SITE_NAME,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: event.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function EventPublicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const event = await fetchPublicEvent(id);

  let seo: React.ReactNode = null;
  if (event) {
    const url = `${BASE}/${locale}/events/${id}`;
    let dateStr = event.startAt;
    try {
      dateStr = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(
        new Date(event.startAt),
      );
    } catch {
      /* keep raw ISO */
    }
    const locationStr =
      event.locationType === 'virtual'
        ? 'Online event'
        : [event.locationDetails?.venueName, event.locationDetails?.city, event.locationDetails?.country]
            .filter(Boolean)
            .join(', ');

    seo = (
      <>
        <JsonLd
          schema={[
            eventSchema(event, url),
            breadcrumbSchema(
              locale,
              { name: 'Events', path: '/events' },
              { name: event.title, path: `/events/${id}` },
            ),
          ]}
        />
        {/* Server-rendered summary so crawlers (and no-JS clients) get the core
            content even though the interactive UI below is client-rendered. */}
        <div className="sr-only">
          <h1>{event.title}</h1>
          <p>{dateStr}</p>
          {locationStr && <p>{locationStr}</p>}
          {event.description && <p>{plainText(event.description)}</p>}
        </div>
      </>
    );
  }

  return (
    <>
      {seo}
      <EventDetailClient />
    </>
  );
}
