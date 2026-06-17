/**
 * Community-type → UI-variant resolution.
 *
 * Communities come back from the backend with a `communityType { name, isEmbassy }`.
 * Most types share one default detail UI; specific types (starting with Embassy)
 * get a bespoke layout. This module is the single place that maps a type to its
 * view variant, so adding a new variant later is a one-line change here.
 */

export type CommunityVariant = 'embassy' | 'default';

export interface CommunityTypeInfo {
  name: string;
  isEmbassy: boolean;
}

/**
 * Lowercase, trim, normalize apostrophes/whitespace so name matching is robust
 * against casing and straight-vs-curly quotes. Shared with CommunityTypeBadge so
 * icon resolution and view resolution stay consistent.
 */
export function normalizeCommunityTypeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\s+/g, ' ');
}

/** Normalized type names that resolve to the Embassy view. */
const EMBASSY_TYPE_NAMES: ReadonlySet<string> = new Set([
  'embassy & consulate',
  'embassy',
]);

/**
 * Resolve which detail-page variant a community should render.
 * Primary signal is the type `name`; `isEmbassy` is a defensive fallback for
 * admin-created embassy types whose name doesn't exactly match the seed.
 */
export function resolveCommunityView(
  communityType?: CommunityTypeInfo | null,
): CommunityVariant {
  if (!communityType) return 'default';
  if (EMBASSY_TYPE_NAMES.has(normalizeCommunityTypeName(communityType.name))) {
    return 'embassy';
  }
  if (communityType.isEmbassy === true) return 'embassy';
  return 'default';
}
