import type { Metadata } from 'next';
import { Suspense } from 'react';
import JsonLd from '@/components/seo/JsonLd';
import { BASE, SITE_NAME, buildAlternates, publicRobots, privateRobots, ogImages, twitterImages } from '@/lib/seo';
import { seoGraphQL, truncate, plainText } from '@/lib/seoFetch';
import { organizationPageSchema, breadcrumbSchema } from '@/lib/seoSchemas';
import CommunityDetailClient from './CommunityDetailClient';
import { toCdnUrl } from '@/lib/cdn';

const COMMUNITY_SEO_QUERY = `
  query CommunitySeo($id: ID!) {
    getCommunity(id: $id) {
      id
      name
      description
      visibility
      memberCount
      avatarUrl
      bannerUrl
      createdAt
      communityType {
        name
        isEmbassy
      }
    }
  }
`;

type SeoCommunity = {
  id: string;
  name: string;
  description?: string | null;
  visibility?: string | null;
  memberCount?: number | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  createdAt?: string | null;
};

async function fetchPublicCommunity(id: string, revalidate = 600): Promise<SeoCommunity | null> {
  const data = await seoGraphQL<{ getCommunity: SeoCommunity | null }>(
    COMMUNITY_SEO_QUERY,
    { id },
    revalidate,
  );
  const c = data?.getCommunity ?? null;
  if (!c) return null;
  if (c.visibility && c.visibility.toUpperCase() !== 'PUBLIC') return null;
  return c;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const c = await fetchPublicCommunity(id);
  const path = `/community/${id}`;

  if (!c) {
    return { title: 'Community', robots: privateRobots, alternates: buildAlternates(path, locale) };
  }

  const title = truncate(c.name, 70);
  const description =
    truncate(plainText(c.description), 160) ||
    `Join the ${c.name} community on ${SITE_NAME}.`;
  const image = toCdnUrl(c.bannerUrl) || toCdnUrl(c.avatarUrl);

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
      ...ogImages(image, c.name, locale),
    },
    twitter: { card: 'summary_large_image', title, description, ...twitterImages(image, locale) },
  };
}

export default async function CommunityPublicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const c = await fetchPublicCommunity(id);

  let seo: React.ReactNode = null;
  if (c) {
    const url = `${BASE}/${locale}/community/${id}`;
    seo = (
      <>
        <JsonLd
          schema={[
            ...organizationPageSchema(c, url, 'Community'),
            breadcrumbSchema(
              locale,
              { name: 'Communities', path: '/community' },
              { name: c.name, path: `/community/${id}` },
            ),
          ]}
        />
        <div className="sr-only">
          <h1>{c.name}</h1>
          {typeof c.memberCount === 'number' && <p>{c.memberCount} members</p>}
          {c.description && <p>{plainText(c.description)}</p>}
        </div>
      </>
    );
  }

  return (
    <>
      {seo}
      {/* CommunityDetailClient calls useSearchParams(); it must sit under a
          Suspense boundary or the server prerender of this dynamic route throws
          (500 on hard refresh, while client navigation still works). */}
      <Suspense fallback={null}>
        <CommunityDetailClient />
      </Suspense>
    </>
  );
}
