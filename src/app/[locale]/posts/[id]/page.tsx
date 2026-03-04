import { redirect } from 'next/navigation';

/**
 * Redirect /posts/[id] to /post/[id] so shared links that use "posts" (e.g. from backend shareLink) still open the post.
 */
export default async function PostsIdRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect(`/${locale}/post/${id}`);
}
