'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { circleSections, currentCircleSection } from './circleSections';

export interface CircleSectionNavProps {
  circleId: string;
  /** Whether the circle has chat switched on; decides the home tab's name. */
  chatOn: boolean;
  className?: string;
}

/**
 * The one navigation every screen of a circle shares.
 *
 * Short labels, so seven tabs sit on one row from a laptop up. Below `md` the
 * row scrolls sideways and keeps a thin visible scrollbar (a mouse cannot swipe,
 * so a hidden one would cut the strip off with no way to reach the rest); from
 * `md` it wraps instead of scrolling, so nothing is ever out of reach however
 * long a translation runs. The current tab scrolls itself into view so a phone
 * does not open on a strip that has hidden where you are.
 *
 * Anchors with `aria-current="page"`, not a toggle: each tab is its own route.
 * Exactly one tab carries it. On a path inside the circle that is not a section
 * (a motion, a project) the home tab carries `aria-current="true"` ("you are in
 * this part") rather than claiming to be the page.
 */
export function CircleSectionNav({ circleId, chatOn, className }: CircleSectionNavProps) {
  const t = useTranslations('circles');
  const pathname = usePathname();
  const current = currentCircleSection(pathname, circleId);
  const sections = circleSections(circleId, chatOn);
  const currentRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Only the strip itself, never the page: `inline: 'nearest'` and `block: 'nearest'` leave the document where it is.
    currentRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <nav aria-label={t('common.circle')} className={cn('border-t border-border-subtle', className)}>
      <ul className="flex items-stretch gap-0.5 overflow-x-auto px-2 [scrollbar-width:thin] md:flex-wrap md:overflow-x-visible md:px-4">
        {sections.map(({ key, href, labelKey, icon: Icon }) => {
          const isCurrent = key === current.key;
          return (
            <li key={key} className="shrink-0">
              <Link
                ref={isCurrent ? currentRef : undefined}
                href={href}
                prefetch={false}
                aria-current={isCurrent ? (current.exact ? 'page' : 'true') : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-text-brand',
                  isCurrent
                    ? 'border-surface-brand text-text-brand dark:border-text-primary dark:text-text-primary'
                    : 'border-transparent text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
                )}
              >
                <Icon aria-hidden="true" />
                {t(`home.nav.${labelKey}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
