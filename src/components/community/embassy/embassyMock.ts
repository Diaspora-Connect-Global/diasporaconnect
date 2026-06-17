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

export interface EmbassyUpcomingEvent {
  id: string;
  month: string; // "JUN"
  day: string; // "15"
  title: string;
  dateLabel: string; // "15 Jun 2025 • 2:00 PM"
  location: string;
}

export interface EmbassyResource {
  id: string;
  icon: string;
  title: string;
  description: string;
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

export const EMBASSY_QUICK_ACTIONS: ReadonlyArray<EmbassyQuickAction> = [
  { key: 'visa', icon: 'FileText', label: 'Visa Information', tab: 'services' },
  { key: 'register', icon: 'Users', label: 'Diaspora Registration', tab: 'services' },
  { key: 'track', icon: 'ClipboardList', label: 'Track Request', tab: 'track-requests' },
  { key: 'emergency', icon: 'BellRing', label: 'Emergency Help', tab: 'support' },
  { key: 'events', icon: 'CalendarDays', label: 'Embassy Events', tab: 'events' },
];

export const EMBASSY_UPCOMING_EVENTS: ReadonlyArray<EmbassyUpcomingEvent> = [
  {
    id: 'evt-1',
    month: 'JUN',
    day: '15',
    title: 'Ghana National Day Celebration 2025',
    dateLabel: '15 Jun 2025 • 2:00 PM',
    location: 'Paris, France',
  },
  {
    id: 'evt-2',
    month: 'JUL',
    day: '05',
    title: 'Diaspora Engagement Forum',
    dateLabel: '5 Jul 2025 • 10:00 AM',
    location: 'Online (Zoom)',
  },
];

export const EMBASSY_RESOURCES: ReadonlyArray<EmbassyResource> = [
  {
    id: 'res-1',
    icon: 'FileText',
    title: 'Visa Information',
    description: 'Requirements, types & application guide',
  },
  {
    id: 'res-2',
    icon: 'Plane',
    title: 'Travel to Ghana',
    description: 'Entry requirements & travel advisory',
  },
  {
    id: 'res-3',
    icon: 'Phone',
    title: 'Embassy Contact',
    description: 'Contact details and location',
  },
  {
    id: 'res-4',
    icon: 'FileDown',
    title: 'Forms & Documents',
    description: 'Download forms and documents',
  },
];

export interface EmbassyPopularService {
  rank: string;
  name: string;
  subtitle: string;
  /** lucide icon name resolved in the component */
  icon: string;
  /** colour tone key → maps to ring/fg classes in the Services tab */
  tone: string;
}

/** Curated "Popular Services" rail on the Services tab (Phase 1 mock). */
export const EMBASSY_POPULAR_SERVICES: ReadonlyArray<EmbassyPopularService> = [
  { rank: '01', name: 'Passport Renewal', subtitle: 'Most requested', icon: 'BookUser', tone: 'green' },
  { rank: '02', name: 'Visa Information', subtitle: 'Travel & Entry', icon: 'CreditCard', tone: 'blue' },
  { rank: '03', name: 'Document Authentication', subtitle: 'Legalization & Attestation', icon: 'FileBadge', tone: 'orange' },
  { rank: '04', name: 'Birth Certificate', subtitle: 'Civil Documents', icon: 'ScrollText', tone: 'purple' },
  { rank: '05', name: 'Power of Attorney', subtitle: 'Authorize a Representative', icon: 'Briefcase', tone: 'blue' },
];

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
 * Returns the embassy profile for a community. Phase 1: always the mock.
 * Phase 2+: read from `community.embassyProfile` and fall back to mock only in dev.
 */
export function getEmbassyProfile(_communityId: string): EmbassyProfile {
  return MOCK_PROFILE;
}
