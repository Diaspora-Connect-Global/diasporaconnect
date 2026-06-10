/**
 * Shared server-side GraphQL fetch + text helpers for SEO surfaces
 * (detail-page `generateMetadata`, dynamic OG images, public settings).
 *
 * Uses an unauthenticated POST to the public GraphQL endpoint — the same
 * approach already proven in the post detail layout. Only request fields that
 * are publicly visible, and always filter results on visibility/status before
 * exposing them to crawlers.
 */

export const GRAPHQL_URL =
  (process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://api.diaspoplug.net/graphql').trim();

/**
 * Run a GraphQL query server-side and return the typed `data` payload, or
 * `null` on any failure. Never throws — SEO surfaces must degrade gracefully.
 *
 * @param revalidate ISR window in seconds (detail pages: 60-300, settings: 3600).
 */
export async function seoGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
  revalidate = 3600,
): Promise<T | null> {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      next: { revalidate },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (!json?.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

/** Trim + clamp text to `maxLen`, appending an ellipsis when truncated. */
export function truncate(text: string | undefined | null, maxLen: number): string {
  if (!text || !text.trim()) return '';
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1) + '…';
}

/** Strip markdown/HTML-ish noise from user content so it reads cleanly in meta tags. */
export function plainText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
