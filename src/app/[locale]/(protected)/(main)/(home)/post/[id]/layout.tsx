import type { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/seo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://diaspoplug.com';
const GRAPHQL_URL = 'https://api.diaspoplug.net/graphql';
const DEFAULT_LOCALE = 'en';

const POST_META_QUERY = `
  query GetPostMeta($id: String!) {
    post(id: $id) {
      id
      text
      attachments {
        url
        mimeType
      }
    }
  }
`;

type PostMetaResult = {
  data?: {
    post?: {
      id: string;
      text?: string | null;
      attachments?: Array<{ url?: string | null; mimeType?: string | null }> | null;
    } | null;
  };
};

async function fetchPostMeta(id: string): Promise<PostMetaResult | null> {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: POST_META_QUERY, variables: { id } }),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PostMetaResult;
  } catch {
    return null;
  }
}

function truncate(text: string | undefined | null, maxLen: number): string {
  if (!text || !text.trim()) return '';
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 3) + '...';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = APP_URL.replace(/\/$/, '');
  const postUrl = `${baseUrl}/${DEFAULT_LOCALE}/post/${id}`;
  const defaultTitle = 'Post | Diaspoplug';
  const defaultDesc = 'View this post on Diaspoplug.';

  const result = await fetchPostMeta(id);
  const post = result?.data?.post;

  // Posts without an image of their own fall back to the generated site card.
  if (!post) {
    return {
      title: defaultTitle,
      description: defaultDesc,
      openGraph: {
        title: defaultTitle,
        description: defaultDesc,
        url: postUrl,
        siteName: 'Diaspoplug',
        ...ogImages(null, 'Diaspoplug', DEFAULT_LOCALE),
      },
      twitter: {
        card: 'summary_large_image',
        title: defaultTitle,
        description: defaultDesc,
        ...twitterImages(null, DEFAULT_LOCALE),
      },
    };
  }

  const title = truncate(post.text, 80) || defaultTitle;
  const description = truncate(post.text, 160) || defaultDesc;
  const firstImage = post.attachments?.find((a) => a.mimeType?.startsWith('image/'))?.url;

  return {
    title: title.length > 60 ? title.slice(0, 57) + '...' : title,
    description,
    openGraph: {
      title,
      description,
      url: postUrl,
      siteName: 'Diaspoplug',
      ...ogImages(firstImage, title, DEFAULT_LOCALE),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...twitterImages(firstImage, DEFAULT_LOCALE),
    },
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
