/**
 * MOCK embassy data for Phase 1.
 *
 * The backend does not yet expose any embassy-specific fields — everything in
 * this file is placeholder content so the Embassy UI can be built and reviewed.
 * The interfaces here double as the target shape for the backend contract
 * (see docs/EMBASSY_BACKEND_CONTRACT.md). When the API is ready, swap the
 * `getEmbassyProfile()` reads for real `community.embassyProfile` data and
 * delete the mock constants.
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
  officeHours: string; // human-readable summary, e.g. "Mon – Fri, 9:00 AM – 5:00 PM"
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

const MOCK_PROFILE: EmbassyProfile = {
  country: 'Ghana',
  countryCode: 'gh',
  flagUrl: '/GLOBE.png',
  isOfficial: true,
  tagline: 'Official community of the Embassy of Ghana in France',
  city: 'Paris, France',
  addressLine: '1 Avenue Foch, 75116 Paris, France',
  phone: '+33 1 45 00 12 34',
  email: 'info@ghanaembassyfrance.fr',
  mapUrl: '#',
  officeHours: 'Mon – Fri, 9:00 AM – 5:00 PM',
  emergencyLine: '+33 7 53 11 23 45',
};

/**
 * Neutral, non-embassy profile used when a "general community" renders the rich
 * tabbed view. No flag, no embassy-specific tagline; contact/location fields are
 * derived from the community where available and otherwise left blank.
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
  mapUrl: '#',
  officeHours: '',
  emergencyLine: '',
};

/** Minimal community shape used to derive neutral profile fields. */
interface ProfileSourceCommunity {
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  locationCountry?: string | null;
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

/* ── Community tab mock content ─────────────────────────────────────────── */

export interface EmbassyStat {
  key: string;
  icon: string;
  tone: string;
  value: string;
  label: string;
  sub: string;
}
export const EMBASSY_COMMUNITY_STATS: ReadonlyArray<EmbassyStat> = [
  { key: 'members', icon: 'Users', tone: 'blue', value: '2.4K', label: 'Members', sub: '+128 this month' },
  { key: 'discussions', icon: 'MessageSquare', tone: 'green', value: '356', label: 'Discussions', sub: '+24 this week' },
  { key: 'online', icon: 'UsersRound', tone: 'orange', value: '42', label: 'Online Now', sub: 'Active members' },
  { key: 'featured', icon: 'Star', tone: 'purple', value: '18', label: 'Featured Posts', sub: 'Top this month' },
];

export const EMBASSY_GUIDELINES: ReadonlyArray<string> = [
  'Be respectful and kind',
  'No spam or self-promotion',
  'Stay on topic',
  'Protect privacy and confidentiality',
];

export interface EmbassyTrendingTopic {
  tag: string;
  posts: number;
}
export const EMBASSY_TRENDING_TOPICS: ReadonlyArray<EmbassyTrendingTopic> = [
  { tag: 'PassportRenewal', posts: 24 },
  { tag: 'VisaInformation', posts: 18 },
  { tag: 'GhanaNationalDay', posts: 15 },
  { tag: 'DiasporaSupport', posts: 12 },
  { tag: 'JobsInFrance', posts: 9 },
];

export const EMBASSY_DISCUSSION_FILTERS: ReadonlyArray<string> = [
  'All Discussions',
  'Questions',
  'General',
  'Opportunities',
  'Support',
];

/** Recently-active member count badge (avatars are stubbed). */
export const EMBASSY_ACTIVE_MEMBERS = { shown: 5, extra: 32 };

/**
 * Returns the profile that backs the rich tabbed detail view.
 *
 * - Embassy communities (`variant === 'embassy'`, the default for back-compat)
 *   get the embassy mock profile (flag, official tagline, contact details).
 * - General communities (`variant === 'general'`) get a NEUTRAL profile: no flag,
 *   no embassy tagline; city/phone/email/address are derived from the community
 *   when available so the rich UI still shows real contact info.
 *
 * Phase 2+: read from `community.embassyProfile` and fall back to mock only in dev.
 */
export function getEmbassyProfile(
  _communityId: string,
  variant: 'embassy' | 'general' = 'embassy',
  community?: ProfileSourceCommunity,
): EmbassyProfile {
  if (variant === 'embassy') return MOCK_PROFILE;
  return {
    ...NEUTRAL_PROFILE,
    country: community?.locationCountry ?? '',
    city: community?.locationCountry ?? '',
    addressLine: community?.address ?? '',
    phone: community?.contactPhone ?? '',
    email: community?.contactEmail ?? '',
  };
}
