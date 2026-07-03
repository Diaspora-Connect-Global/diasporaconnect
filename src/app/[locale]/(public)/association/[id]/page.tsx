import type { Metadata } from 'next';
import JsonLd from '@/components/seo/JsonLd';
import { BASE, SITE_NAME, buildAlternates, publicRobots, privateRobots } from '@/lib/seo';
import { seoGraphQL, truncate, plainText } from '@/lib/seoFetch';
import { organizationPageSchema, breadcrumbSchema } from '@/lib/seoSchemas';
import AssociationDetailClient from './AssociationDetailClient';
import { toCdnUrl } from '@/lib/cdn';

const DEFAULT_IMAGE = '/og-default.png';

const ASSOCIATION_SEO_QUERY = `
  query AssociationSeo($id: ID!) {
    getAssociation(id: $id) {
      id
      name
      description
      visibility
      memberCount
      avatarUrl
      createdAt
      associationType { name }
    }
  }
`;

type SeoAssociation = {
  id: string;
  name: string;
  description?: string | null;
  visibility?: string | null;
  memberCount?: number | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  associationType?: { name?: string | null } | null;
};

async function fetchPublicAssociation(id: string, revalidate = 600): Promise<SeoAssociation | null> {
  const data = await seoGraphQL<{ getAssociation: SeoAssociation | null }>(
    ASSOCIATION_SEO_QUERY,
    { id },
    revalidate,
  );
  const a = data?.getAssociation ?? null;
  if (!a) return null;
  if (a.visibility && a.visibility.toUpperCase() !== 'PUBLIC') return null;
  return a;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const a = await fetchPublicAssociation(id);
  const path = `/association/${id}`;

  if (!a) {
    return { title: 'Association', robots: privateRobots, alternates: buildAlternates(path, locale) };
  }

  const title = truncate(a.name, 70);
  const description =
    truncate(plainText(a.description), 160) ||
    `${a.associationType?.name ? `${a.associationType.name} · ` : ''}Connect with ${a.name} on ${SITE_NAME}.`;
  const image = toCdnUrl(a.avatarUrl) || DEFAULT_IMAGE;

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
      images: [{ url: image, width: 1200, height: 630, alt: a.name }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function AssociationPublicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const a = await fetchPublicAssociation(id);

  let seo: React.ReactNode = null;
  if (a) {
    const url = `${BASE}/${locale}/association/${id}`;
    seo = (
      <>
        <JsonLd
          schema={[
            ...organizationPageSchema(a, url, 'Association'),
            breadcrumbSchema(
              locale,
              { name: 'Associations', path: '/association' },
              { name: a.name, path: `/association/${id}` },
            ),
          ]}
        />
        <div className="sr-only">
          <h1>{a.name}</h1>
          {a.associationType?.name && <p>{a.associationType.name}</p>}
          {typeof a.memberCount === 'number' && <p>{a.memberCount} members</p>}
          {a.description && <p>{plainText(a.description)}</p>}
        </div>
      </>
    );
  }

  return (
    <>
      {seo}
      <AssociationDetailClient />
    </>
  );
}
