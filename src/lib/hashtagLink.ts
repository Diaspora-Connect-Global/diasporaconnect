/**
 * Where a hashtag leads: the feed of posts that carry it (`/feed?hashtag=…`).
 *
 * One definition for every surface that shows a hashtag — post and comment
 * text (richTextRenderer), Trending topics on the Community rail and its phone
 * drawer — so they can never point to different places. The backend lowercases
 * tags when it stores and looks them up, so the case in the link does not matter.
 */
export function hashtagHref(tag: string): string {
  const slug = tag.trim().replace(/^#+/, '');
  return `/feed?hashtag=${encodeURIComponent(slug)}`;
}
