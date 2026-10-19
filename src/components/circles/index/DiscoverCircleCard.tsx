'use client';

import { useTranslations } from 'next-intl';

import { CircleJoinAction } from '@/components/circles/join';
import { toCdnUrl } from '@/lib/cdn';
import type { CirclePublicCard } from '@/services/gql/types/circles';

import { CircleAvatar } from './CircleImagery';

export interface DiscoverCircleCardProps {
  circle: CirclePublicCard;
}

/**
 * One discoverable circle, rendered from `CirclePublicCard` and nothing else.
 *
 * `CirclePublicCard` is a distinct gateway type, not a filtered `Circle`: it
 * enumerates exactly what a non-member may see. So this component takes that
 * type and only that type — handing it a `Circle` would compile and would leak
 * the inside of a circle onto a public card.
 *
 * ## OPEN, REQUEST and INVITE_ONLY (see `CircleJoinAction`)
 *
 * OPEN gets "Join circle" (one step, `circleJoin`), REQUEST keeps "Request
 * Access", INVITE_ONLY gets no button:
 *
 * ## Why INVITE_ONLY gets no button
 *
 * `discoverable` and `joinMode` are independent axes, so an invite-only circle
 * can legitimately appear in Discover. But `requestToJoinCircle` refuses one:
 * circle-service checks `joinMode.acceptsJoinRequests()` and throws
 * `CircleNotAcceptingJoinRequestsError`. A button there would fail every single
 * time it was pressed, so the card states how to get in and offers no action
 * instead of offering one that cannot work.
 *
 * ## Why the action is "Request Access" and not "View Circle"
 *
 * There is no public preview of a circle. `/circles/[id]` loads the member
 * aggregate, which comes back null for a non-member, and the screen answers
 * "This circle is private". A "View" button would therefore walk every viewer
 * into a wall. Requesting access is the only thing a non-member can actually do
 * from here, so that is what the card offers.
 *
 * ## Shape
 *
 * `h-full` + `mt-auto` on the footer, because these are grid tiles: a circle
 * with no tagline and one with a two-line tagline must still line their buttons
 * up along the row.
 */
export function DiscoverCircleCard({ circle }: DiscoverCircleCardProps) {
  const t = useTranslations('circles');

  return (
    <div className="flex h-full flex-col rounded-lg border border-border-subtle bg-surface-default p-4">
      <div className="flex items-start gap-3">
        <CircleAvatar
          name={circle.name}
          src={toCdnUrl(circle.avatarUrl)}
          className="size-10"
        />

        <div className="min-w-0 flex-1">
          <h3 className="label-medium truncate text-text-primary">
            {circle.name}
          </h3>
          {/*
            The meta line reads "Public · 24 members". "Public" is derived from
            `joinMode`, not invented: every circle in Discover is already
            `discoverable`, so the only remaining question is whether a stranger
            can ask to get in.
          */}
          <p className="caption-small mt-0.5 text-text-secondary">
            {circle.joinMode === 'OPEN'
              ? t('index.access.open')
              : circle.joinMode === 'REQUEST'
                ? t('index.access.public')
                : t('index.access.inviteOnly')}
            <span aria-hidden="true" className="px-1">
              ·
            </span>
            {t('common.memberCount', { count: circle.memberCount })}
          </p>
        </div>
      </div>

      {/* Only rendered when the circle actually wrote one — never a filler line. */}
      {circle.tagline ? (
        <p className="caption-small mt-3 line-clamp-2 text-text-secondary">
          {circle.tagline}
        </p>
      ) : null}

      <div className="mt-auto pt-4">
        {/*
          OPEN → Join circle · REQUEST → Request Access · INVITE_ONLY → no action
          exists, so the same height is kept for text and the tile stays in line.
        */}
        <CircleJoinAction circleId={circle.id} joinMode={circle.joinMode} />
      </div>
    </div>
  );
}
