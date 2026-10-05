import { redirect } from 'next/navigation';

/**
 * Redirect /posts/[id] to /post/[id] so shared links that use "posts" (e.g. from backend shareLink) still open the post.
 * The query string travels with it (e.g. `?commentId=` deep-links to a comment).
 */
export default async function PostsIdRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value !== undefined) query.append(key, value);
  }
  const qs = query.toString();
  // `id` arrives decoded; re-encode it so `..%2F` cannot walk the redirect elsewhere.
  redirect(`/${locale}/post/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`);
}
