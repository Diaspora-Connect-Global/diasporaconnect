import type { EmbassyCommunity } from './types';

/**
 * The subset of the association detail object (GET_ASSOCIATION / GET_ASSOCIATION_DETAILS)
 * that the embassy tabbed view can consume. Associations carry far fewer fields
 * than communities.
 */
export interface AssociationForEmbassy {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  memberCount?: number | null;
  createdAt?: string | null;
  membershipStatus?: string | null;
  enabledServices?: string[] | null;
}

/**
 * Adapts an association detail object into the `EmbassyCommunity` prop shape the
 * embassy tabbed view expects, so associations can render the SAME owner-type
 * aware module (variant 'general', ownerKind 'association').
 *
 * `id` is set to the associationId — the id every tab forwards as the owner id
 * (paired with ownerType ASSOCIATION). Associations LACK communityRules,
 * bannerUrl, contact email/phone, address, locationCountry, communityType and
 * embassyProfile; those are provided as safe null/undefined defaults so headers
 * and tabs degrade gracefully (empty states, never a crash, no fabricated data).
 * `enabledServices` and `membershipStatus` are carried through unchanged so the
 * same gating helper (isTabEnabled) applies.
 */
export function associationToEmbassyCommunity(a: AssociationForEmbassy): EmbassyCommunity {
  return {
    id: a.id,
    name: a.name,
    description: a.description ?? undefined,
    // Associations have no rules/banner/contact/location metadata.
    communityRules: null,
    avatarUrl: a.avatarUrl ?? undefined,
    bannerUrl: null,
    memberCount: a.memberCount ?? 0,
    createdAt: a.createdAt ?? undefined,
    membershipStatus: a.membershipStatus ?? null,
    enabledServices: a.enabledServices ?? null,
    contactEmail: null,
    contactPhone: null,
    address: null,
    locationCountry: null,
    // No embassy/community-type metadata — the view renders with variant 'general'.
    communityType: null,
    embassyProfile: null,
  };
}
