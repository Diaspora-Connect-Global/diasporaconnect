/**
 * CDN URL rewriting.
 *
 * Stored media lives in GCS at
 *   https://storage.googleapis.com/diaspoplug-media/<key>
 * When `NEXT_PUBLIC_CDN_URL` is configured (e.g. https://cdn.diaspoplug.net),
 * we rewrite those URLs to be served through the CDN:
 *   ${NEXT_PUBLIC_CDN_URL}/<key>
 *
 * This is applied at the data-mapping layer (where GraphQL responses are turned
 * into view models) so existing stored GCS URLs are served via the CDN without
 * any DB migration. When the env var is empty/undefined every call is a no-op
 * that returns the original value untouched.
 *
 * Pure + side-effect free → trivially unit-testable.
 */

/** GCS public-object prefix for the media bucket. */
const GCS_BUCKET_PREFIX = 'https://storage.googleapis.com/diaspoplug-media/';

/**
 * Rewrite a stored GCS media URL to its CDN equivalent.
 *
 * - Returns the input unchanged when `NEXT_PUBLIC_CDN_URL` is unset/empty.
 * - Returns the input unchanged for empty/nullish values and non-GCS URLs.
 * - Strips a single trailing slash from the configured CDN base so we never
 *   produce a double slash before `<key>`.
 */
export function toCdnUrl(url?: string | null): string {
  if (!url) return url ?? '';

  const cdnBase = process.env.NEXT_PUBLIC_CDN_URL;
  if (!cdnBase) return url;

  if (!url.startsWith(GCS_BUCKET_PREFIX)) return url;

  const key = url.slice(GCS_BUCKET_PREFIX.length);
  const base = cdnBase.replace(/\/+$/, '');
  return `${base}/${key}`;
}
