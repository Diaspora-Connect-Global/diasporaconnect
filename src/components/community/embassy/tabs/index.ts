/** Embassy sub-navigation tab registry. */

export const EMBASSY_TAB_KEYS = [
  'home',
  'updates',
  'services',
  'track-requests',
  'events',
  'support',
  'community',
  'rules',
  'groups',
] as const;

export type EmbassyTabKey = (typeof EMBASSY_TAB_KEYS)[number];

export const DEFAULT_EMBASSY_TAB: EmbassyTabKey = 'home';

export interface EmbassyTabDef {
  key: EmbassyTabKey;
  /** lucide-react icon name, resolved in the tab bar. */
  icon: string;
  /** i18n key under `community.embassy.tabs`. */
  labelKey: string;
}

export const EMBASSY_TABS: ReadonlyArray<EmbassyTabDef> = [
  { key: 'home', icon: 'Home', labelKey: 'home' },
  { key: 'updates', icon: 'Megaphone', labelKey: 'updates' },
  { key: 'services', icon: 'LayoutGrid', labelKey: 'services' },
  { key: 'track-requests', icon: 'ClipboardList', labelKey: 'trackRequests' },
  { key: 'events', icon: 'CalendarDays', labelKey: 'events' },
  { key: 'support', icon: 'LifeBuoy', labelKey: 'support' },
  { key: 'community', icon: 'Users', labelKey: 'community' },
  { key: 'rules', icon: 'ShieldCheck', labelKey: 'rules' },
  { key: 'groups', icon: 'UsersRound', labelKey: 'groups' },
];

/** Parse an arbitrary `?tab=` value into a known key, defaulting to home. */
export function parseEmbassyTab(value: string | null | undefined): EmbassyTabKey {
  if (value && (EMBASSY_TAB_KEYS as readonly string[]).includes(value)) {
    return value as EmbassyTabKey;
  }
  return DEFAULT_EMBASSY_TAB;
}
