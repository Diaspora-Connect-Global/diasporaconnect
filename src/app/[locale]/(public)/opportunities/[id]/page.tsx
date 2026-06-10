import type { Metadata } from 'next';
import JsonLd from '@/components/seo/JsonLd';
import { BASE, SITE_NAME, buildAlternates, publicRobots, privateRobots } from '@/lib/seo';
import { seoGraphQL, truncate, plainText } from '@/lib/seoFetch';
import { jobPostingSchema, breadcrumbSchema } from '@/lib/seoSchemas';
import OpportunityDetailClient from './OpportunityDetailClient';

const DEFAULT_IMAGE = '/og-default.png';

const OPPORTUNITY_SEO_QUERY = `
  query OpportunitySeo($id: String!) {
    getOpportunity(id: $id) {
      id
      title
      description
      status
      visibility
      type
      location
      compensationMin
      compensationMax
      compensationCurrency
      eligibilityRegions
      deadline
      publishedAt
      owner { name }
    }
  }
`;

type SeoOpportunity = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  visibility?: string | null;
  type?: string | null;
  location?: string | null;
  compensationMin?: number | null;
  compensationMax?: number | null;
  compensationCurrency?: string | null;
  eligibilityRegions?: string[] | null;
  deadline?: string | null;
  publishedAt?: string | null;
  owner?: { name?: string | null } | null;
};

async function fetchPublicOpportunity(id: string, revalidate = 300): Promise<SeoOpportunity | null> {
  const data = await seoGraphQL<{ getOpportunity: SeoOpportunity | null }>(
    OPPORTUNITY_SEO_QUERY,
    { id },
    revalidate,
  );
  const o = data?.getOpportunity ?? null;
  if (!o) return null; // also the case for category-slug pseudo-routes — they stay noindex
  if (o.status && o.status.toUpperCase() !== 'PUBLISHED') return null;
  if (o.visibility && o.visibility.toUpperCase() !== 'PUBLIC') return null;
  return o;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const o = await fetchPublicOpportunity(id);
  const path = `/opportunities/${id}`;

  if (!o) {
    return { title: 'Opportunity', robots: privateRobots, alternates: buildAlternates(path, locale) };
  }

  const title = truncate(o.title, 70);
  const description =
    truncate(plainText(o.description), 160) || `Discover this opportunity on ${SITE_NAME}.`;

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
      images: [{ url: DEFAULT_IMAGE, width: 1200, height: 630, alt: o.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_IMAGE] },
  };
}

export default async function OpportunityPublicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const o = await fetchPublicOpportunity(id);

  let seo: React.ReactNode = null;
  if (o) {
    const url = `${BASE}/${locale}/opportunities/${id}`;
    seo = (
      <>
        <JsonLd
          schema={[
            jobPostingSchema(o, url),
            breadcrumbSchema(
              locale,
              { name: 'Opportunities', path: '/opportunities' },
              { name: o.title, path: `/opportunities/${id}` },
            ),
          ]}
        />
        <div className="sr-only">
          <h1>{o.title}</h1>
          {o.location && <p>{o.location}</p>}
          {o.description && <p>{plainText(o.description)}</p>}
        </div>
      </>
    );
  }

  return (
    <>
      {seo}
      <OpportunityDetailClient />
    </>
  );
}
