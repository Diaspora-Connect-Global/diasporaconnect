/**
 * Community-type → UI-variant resolution.
 *
 * Communities come back from the backend with a `communityType { name, isEmbassy }`.
 * EVERY community now renders the rich tabbed detail UI; this module only decides
 * which *variant* of that rich UI applies — 'embassy' (embassy-specific copy) or
 * 'general' (neutral copy for all other types). This is the single place that maps
 * a type to its variant, so adding a new variant later is a one-line change here.
 *
 * The `CommunityVariant` type is re-exported from the shared `communityVariant`
 * module so the resolver and the React context stay in lockstep.
 */

export type { CommunityVariant } from '@/components/community/embassy/communityVariant';
import type { CommunityVariant } from '@/components/community/embassy/communityVariant';

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
 * Resolve which rich-detail-page variant a community should render.
 * Every community renders the rich tabbed UI; this only picks the copy variant.
 * Embassy types → 'embassy'; everything else (including a null type) → 'general'.
 * Primary signal is the type `name`; `isEmbassy` is a defensive fallback for
 * admin-created embassy types whose name doesn't exactly match the seed.
 */
export function resolveCommunityView(
  communityType?: CommunityTypeInfo | null,
): CommunityVariant {
  if (!communityType) return 'general';
  if (EMBASSY_TYPE_NAMES.has(normalizeCommunityTypeName(communityType.name))) {
    return 'embassy';
  }
  if (communityType.isEmbassy === true) return 'embassy';
  return 'general';
}
