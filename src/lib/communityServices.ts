/**
 * Member-facing service-module gating.
 *
 * Community and Association GraphQL types expose `enabledServices: [String!]` — a
 * list of enabled member-facing service module keys. The UI must only surface the
 * modules (tabs / quick-actions / widgets) whose backing service is enabled.
 *
 * IMPORTANT null-semantics (non-destructive default):
 *  - `enabledServices == null | undefined` → the field was not loaded / a legacy
 *    payload. Treat as ALL enabled (show everything).
 *  - `enabledServices == []` (empty array) → genuinely "none enabled". Hide every
 *    non-home tab / gated widget.
 */

import { EMBASSY_TABS, type EmbassyTabDef, type EmbassyTabKey } from '@/components/community/embassy/tabs';

/** Canonical service module keys emitted by the API. */
export const CANONICAL_SERVICE_KEYS = [
  'posts',
  'events',
  'opportunities',
  'marketplace',
  'groups',
  'support',
  'service_requests',
  'resources',
  'directory',
  'registry',
] as const;

export type ServiceKey = (typeof CANONICAL_SERVICE_KEYS)[number];

/**
 * Service key → Embassy tab key(s) it unlocks.
 *
 * `service_requests` powers both the "Services" catalog tab and the
 * "Track Requests" tab. `resources` gates the Home right-rail widget (not a tab)
 * and is handled via `isServiceEnabled` directly. Services with no community-tab
 * mapping (opportunities, marketplace, registry) live on separate top-level
 * routes and are intentionally omitted here.
 */
export const SERVICE_TO_TAB: Readonly<Record<string, readonly EmbassyTabKey[]>> = {
  posts: ['updates'],
  service_requests: ['services', 'track-requests'],
  events: ['events'],
  support: ['support'],
  directory: ['community'],
  groups: ['groups'],
};

/**
 * Tabs that no service module gates.
 *
 * 'home' is the landing feed. 'rules' is the community's own guidelines — it is
 * a property of the community itself, not of any service it has switched on, so
 * routing it through SERVICE_TO_TAB would hide it from every community with a
 * non-null `enabledServices` (the `!services` branch below returns false for any
 * unmapped tab). Whether it is worth showing at all is a question about
 * CONTENT, and is answered by the tab bar's `hasRules`, not here.
 */
const ALWAYS_ON_TABS: ReadonlySet<EmbassyTabKey> = new Set<EmbassyTabKey>(['home', 'rules']);

/**
 * Is a given service enabled?
 * `null`/`undefined` → all enabled (legacy/non-loaded). `[]` → none enabled.
 */
export function isServiceEnabled(
  serviceKey: string,
  enabledServices?: readonly string[] | null,
): boolean {
  if (enabledServices == null) return true;
  return enabledServices.includes(serviceKey);
}

/**
 * Should a tab be shown?
 * 'home' and 'rules' are always visible. `enabledServices == null` → show all
 * (non-destructive).
 * Otherwise the tab is shown iff at least one service that maps to it is enabled.
 */
export function isTabEnabled(
  tabKey: string,
  enabledServices?: readonly string[] | null,
): boolean {
  if (ALWAYS_ON_TABS.has(tabKey as EmbassyTabKey)) return true;
  if (enabledServices == null) return true;
  const services = SERVICE_TO_TAB[tabKey];
  if (!services || services.length === 0) return false;
  return services.some((service) => enabledServices.includes(service));
}

/** Filter a list of Embassy tab defs down to the enabled ones. */
export function filterTabs(
  tabs: ReadonlyArray<EmbassyTabDef>,
  enabledServices?: readonly string[] | null,
): EmbassyTabDef[] {
  return tabs.filter((tab) => isTabEnabled(tab.key, enabledServices));
}

/** Convenience: the enabled Embassy tabs from the canonical registry. */
export function enabledEmbassyTabs(
  enabledServices?: readonly string[] | null,
): EmbassyTabDef[] {
  return filterTabs(EMBASSY_TABS, enabledServices);
}
