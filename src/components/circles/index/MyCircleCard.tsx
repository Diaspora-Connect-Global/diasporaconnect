'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';
import { cn } from '@/lib/utils';
import type { Circle } from '@/services/gql/types/circles';

import { CircleBanner } from './CircleImagery';
import { CirclePills } from './CirclePills';
import { useCircleSignals } from './useCircleSignals';

export interface MyCircleCardProps {
  circle: Circle;
  /** Resolved once for the whole screen by `useCircleUnreadCounts`. */
  unreadCount?: number;
}

/**
 * One of the caller's own circles, as a tile in the index grid.
 *
 * The card is a single link to the circle rather than a card with a link
 * inside it: everything on it — banner, name, pills — is about the same
 * destination, and splitting that into several tab stops makes the tile slower
 * to get through with a keyboard for no gain.
 *
 * ## Shape
 *
 * `h-full` + `flex-col` + `mt-auto` on the pill row, because the tiles sit in a
 * grid: a one-line name and a wrapped two-line name would otherwise put their
 * status pills at different heights across a row, and the pills are the thing
 * the eye scans along. Pinning them to the bottom keeps that scan straight.
 *
 * The banner is a fixed 16:9 box rather than a fixed pixel height so it holds
 * its proportions as the column narrows from three tiles to two to one.
 *
 * There is deliberately no avatar overlapping the banner: at tile size the two
 * images competed, and the banner already carries the circle's identity — when
 * there is no banner, `CircleBanner` renders the circle's initial in its place.
 *
 * No coloured border. Colour on this screen means state (an urgent vote, unread
 * messages), and a card outline that is always coloured would drown that out.
 */
export function MyCircleCard({ circle, unreadCount }: MyCircleCardProps) {
  const t = useTranslations('circles');
  const signals = useCircleSignals(circle.id);

  return (
    <Link
      href={`/circles/${circle.id}`}
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-default',
        'transition-colors hover:bg-surface-subtle',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand',
      )}
    >
      <CircleBanner
        src={toCdnUrl(circle.bannerUrl)}
        name={circle.name}
        className="aspect-[16/9] shrink-0"
      />

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="label-medium truncate text-text-primary">
            {circle.name}
          </h3>
          {circle.status === 'ACTIVE' ? (
            <>
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full bg-text-success"
              />
              <span className="sr-only">{t('common.active')}</span>
            </>
          ) : null}
        </div>

        <p className="caption-small text-text-secondary">
          {t('common.memberCount', { count: circle.memberCount })}
        </p>

        <div className="mt-auto pt-3">
          <CirclePills signals={signals} unreadCount={unreadCount} />
        </div>
      </div>
    </Link>
  );
}
