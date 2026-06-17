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
  { key: 'verified', icon: 'ShieldCheck', label: 'Verified Services', tab: 'verified-services' },
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

/**
 * Returns the embassy profile for a community. Phase 1: always the mock.
 * Phase 2+: read from `community.embassyProfile` and fall back to mock only in dev.
 */
export function getEmbassyProfile(_communityId: string): EmbassyProfile {
  return MOCK_PROFILE;
}
