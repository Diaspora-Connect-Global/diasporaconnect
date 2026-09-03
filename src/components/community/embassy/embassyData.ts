/**
 * Embassy data mapping + UI configuration.
 *
 * This module maps the real backend `community.embassyProfile` into the shape the
 * embassy UI consumes, and holds the genuine UI configuration (quick actions and
 * discussion filters) that drives the tabbed community view. It contains no mock
 * content — when a field is absent the UI treats the empty string as "hide".
 */

import type { EmbassyTabKey } from './tabs';

/** Core embassy identity/contact metadata — maps to `community.embassyProfile`. */
export interface EmbassyProfile {
  country: string;
  countryCode: string; // ISO-3166 alpha-2, for flag rendering
  flagUrl: string;
  isOfficial: boolean;
  tagline: string;
  city: string;
  addressLine: string;
  phone: string;
  email: string;
  mapUrl: string;
  officeHours: string; // human-readable summary, e.g. "Mon - Fri, 9:00 AM - 5:00 PM"
  emergencyLine: string;
}

export interface EmbassyQuickAction {
  key: string;
  /** lucide icon name resolved in the component */
  icon: string;
  label: string;
  /** Tab to navigate to when clicked. */
  tab: EmbassyTabKey;
}

/**
 * Raw backend `embassyProfile` shape. All fields are nullable on the wire; the
 * mapping below coerces null/undefined to '' to satisfy the non-null
 * `EmbassyProfile` interface (the UI treats '' as "hide").
 */
export interface EmbassyProfileSource {
  country?: string | null;
  countryCode?: string | null;
  flagUrl?: string | null;
  isOfficial?: boolean | null;
  tagline?: string | null;
  city?: string | null;
  addressLine?: string | null;
  phone?: string | null;
  email?: string | null;
  mapUrl?: string | null;
  officeHours?: string | null;
  emergencyLine?: string | null;
}

/** Minimal community shape used to map/derive the profile fields. */
interface ProfileSourceCommunity {
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  locationCountry?: string | null;
  embassyProfile?: EmbassyProfileSource | null;
}

export const EMBASSY_QUICK_ACTIONS: ReadonlyArray<EmbassyQuickAction> = [
  { key: 'visa', icon: 'FileText', label: 'Visa Information', tab: 'services' },
  { key: 'register', icon: 'Users', label: 'Diaspora Registration', tab: 'services' },
  { key: 'track', icon: 'ClipboardList', label: 'Track Request', tab: 'track-requests' },
  { key: 'emergency', icon: 'BellRing', label: 'Emergency Help', tab: 'support' },
  { key: 'events', icon: 'CalendarDays', label: 'Embassy Events', tab: 'events' },
];

/**
 * Quick actions for general (non-embassy) communities. Uses neutral,
 * community-oriented labels instead of the embassy/consular ones, but points at
 * the same shared tabs.
 */
export const GENERAL_QUICK_ACTIONS: ReadonlyArray<EmbassyQuickAction> = [
  { key: 'discussions', icon: 'Users', label: 'Discussions', tab: 'community' },
  { key: 'events', icon: 'CalendarDays', label: 'Events', tab: 'events' },
  { key: 'updates', icon: 'Megaphone', label: 'Updates', tab: 'updates' },
  { key: 'services', icon: 'LayoutGrid', label: 'Services', tab: 'services' },
  { key: 'support', icon: 'LifeBuoy', label: 'Get Support', tab: 'support' },
];

/** Quick actions for the given community variant. */
export function getQuickActions(
  variant: 'embassy' | 'general' = 'embassy',
): ReadonlyArray<EmbassyQuickAction> {
  return variant === 'embassy' ? EMBASSY_QUICK_ACTIONS : GENERAL_QUICK_ACTIONS;
}

export const EMBASSY_DISCUSSION_FILTERS: ReadonlyArray<string> = [
  'All Discussions',
  'Questions',
  'General',
  'Opportunities',
  'Support',
];

/**
 * Neutral, non-embassy profile used when a "general community" (no
 * `embassyProfile`) renders the rich tabbed view. No flag, no embassy-specific
 * tagline; contact/location fields are derived from the community where
 * available and otherwise left blank.
 */
const NEUTRAL_PROFILE: EmbassyProfile = {
  country: '',
  countryCode: '',
  flagUrl: '',
  isOfficial: false,
  tagline: '',
  city: '',
  addressLine: '',
  phone: '',
  email: '',
  mapUrl: '',
  officeHours: '',
  emergencyLine: '',
};

/** Coerce a nullable backend string to the non-null '' the UI expects. */
const str = (v?: string | null): string => v ?? '';

/**
 * Returns the profile that backs the rich tabbed detail view, mapped from real
 * backend data.
 *
 * - When `community.embassyProfile` is present (embassy communities), map each
 *   field, coercing null/undefined to '' so the non-null `EmbassyProfile`
 *   interface is satisfied and the UI hides empty fields.
 * - When `community.embassyProfile` is null/absent (general communities), derive
 *   a NEUTRAL profile from the real community fields (locationCountry / address /
 *   contactPhone / contactEmail).
 */
export function getEmbassyProfile(
  _communityId: string,
  _variant: 'embassy' | 'general' = 'embassy',
  community?: ProfileSourceCommunity,
): EmbassyProfile {
  const source = community?.embassyProfile;
  if (source) {
    return {
      country: str(source.country),
      countryCode: str(source.countryCode),
      flagUrl: str(source.flagUrl),
      isOfficial: source.isOfficial ?? false,
      tagline: str(source.tagline),
      city: str(source.city),
      addressLine: str(source.addressLine),
      phone: str(source.phone),
      email: str(source.email),
      mapUrl: str(source.mapUrl),
      officeHours: str(source.officeHours),
      emergencyLine: str(source.emergencyLine),
    };
  }
  return {
    ...NEUTRAL_PROFILE,
    country: str(community?.locationCountry),
    city: str(community?.locationCountry),
    addressLine: str(community?.address),
    phone: str(community?.contactPhone),
    email: str(community?.contactEmail),
  };
}
