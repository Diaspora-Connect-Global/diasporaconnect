'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { EMBASSY_TABS, type EmbassyTabKey } from './tabs';
import { embassyIcon } from './icons';
import { filterTabs } from '@/lib/communityServices';

interface EmbassyTabBarProps {
  active: EmbassyTabKey;
  /**
   * Enabled member-facing service keys. `null`/undefined → all tabs shown
   * (non-destructive default); `[]` → only the always-on 'home' tab.
   */
  enabledServices?: string[] | null;
  /**
   * Does this community actually have guidelines written?
   *
   * The Rules tab is ungated by service module (see ALWAYS_ON_TABS), so without
   * this every association would carry a permanently empty tab — associations
   * have no `communityRules` field at all, the adapter hard-codes it to null.
   * Absent/undefined is treated as "show", matching the enabledServices
   * null-semantics: an unknown answer never removes navigation.
   */
  hasRules?: boolean;
}

/**
 * Horizontal, URL-driven sub-navigation for the embassy mini-app. Each tab is a
 * shareable `?tab=<key>` link (locale-aware via next-intl Link) so refresh and
 * deep-linking work. Active tab gets a brand underline (mirrors NavigationTabs).
 */
export function EmbassyTabBar({ active, enabledServices, hasRules }: EmbassyTabBarProps) {
  const t = useTranslations('community.embassy.tabs');
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visibleTabs = filterTabs(EMBASSY_TABS, enabledServices).filter(
    // Keep the tab when it is the one currently open, even with no rules — the
    // active tab vanishing from the bar it is highlighted in is worse than one
    // empty tab, and a stale `?tab=rules` link stays self-explanatory.
    (tab) => tab.key !== 'rules' || hasRules !== false || active === 'rules',
  );

  // Keep the active tab visible on mobile when it sits off-screen in the
  // horizontally-scrollable list (e.g. deep-linked to a trailing tab).
  const activeRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (typeof window !== 'undefined' && activeRef.current) {
      activeRef.current.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }, [active]);

  /** Build a query object that preserves existing params and sets `tab`. */
  function hrefFor(key: EmbassyTabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    const query: Record<string, string> = {};
    params.forEach((value, name) => {
      query[name] = value;
    });
    return { pathname, query };
  }

  return (
    <nav
      className="sticky top-0 z-10 border-b border-border-subtle bg-surface-default px-1 lg:px-4"
      aria-label="Embassy sections"
    >
      <div className="relative">
        <ul className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {visibleTabs.map((tab) => {
            const Icon = embassyIcon(tab.icon);
            const isActive = tab.key === active;
            return (
              <li key={tab.key} ref={isActive ? activeRef : undefined} className="flex-shrink-0">
                <Link
                  href={hrefFor(tab.key)}
                  scroll={false}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 label-medium transition-colors',
                    isActive
                      ? 'border-border-brand text-text-brand'
                      : 'border-transparent text-text-secondary hover:text-text-primary',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {t(tab.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
        {/* Mobile-only right-edge fade hinting that more tabs scroll into view. */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface-default to-transparent lg:hidden"
          aria-hidden
        />
      </div>
    </nav>
  );
}

export default EmbassyTabBar;
