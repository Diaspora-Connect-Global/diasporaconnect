'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { toCdnUrl } from '@/lib/cdn';
import { cn } from '@/lib/utils';
import type { Circle } from '@/services/gql/types/circles';

import { CircleAvatar, CircleBanner } from './CircleImagery';
import { CirclePills } from './CirclePills';
import { useCircleSignals } from './useCircleSignals';

export interface MyCircleCardProps {
  circle: Circle;
  /** Resolved once for the whole screen by `useCircleUnreadCounts`. */
  unreadCount?: number;
}

/**
 * One of the caller's own circles.
 *
 * The card is a single link to the circle rather than a card with a link
 * inside it: everything on it — banner, name, pills — is about the same
 * destination, and splitting that into several tab stops makes the row slower
 * to get through with a keyboard for no gain.
 */
export function MyCircleCard({ circle, unreadCount }: MyCircleCardProps) {
  const t = useTranslations('circles');
  const signals = useCircleSignals(circle.id);

  return (
    <Link
      href={`/circles/${circle.id}`}
      className={cn(
        'block overflow-hidden rounded-lg border border-border-subtle bg-surface-default',
        'transition-colors hover:bg-surface-subtle',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-brand',
      )}
    >
      <CircleBanner src={toCdnUrl(circle.bannerUrl)} className="h-28" />

      <div className="p-4">
        <div className="-mt-12 mb-3 flex">
          <CircleAvatar
            name={circle.name}
            src={toCdnUrl(circle.avatarUrl)}
            className="size-14 border-4 border-surface-default"
          />
        </div>

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

        <p className="caption-small mb-3 text-text-secondary">
          {t('common.memberCount', { count: circle.memberCount })}
        </p>

        <CirclePills signals={signals} unreadCount={unreadCount} />
      </div>
    </Link>
  );
}
