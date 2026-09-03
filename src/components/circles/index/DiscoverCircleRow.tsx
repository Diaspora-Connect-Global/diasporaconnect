'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ButtonType1 } from '@/components/custom/button';
import { toCdnUrl } from '@/lib/cdn';
import { REQUEST_TO_JOIN_CIRCLE } from '@/services/gql/circles';
import type {
  CirclePublicCard,
  RequestToJoinCircleData,
} from '@/services/gql/types/circles';

import { CircleAvatar } from './CircleImagery';

export interface DiscoverCircleRowProps {
  circle: CirclePublicCard;
}

/**
 * One discoverable circle, rendered from `CirclePublicCard` and nothing else.
 *
 * `CirclePublicCard` is a distinct gateway type, not a filtered `Circle`: it
 * enumerates exactly what a non-member may see. So this component takes that
 * type and only that type — handing it a `Circle` would compile and would leak
 * the inside of a circle onto a public row.
 *
 * ## Why INVITE_ONLY gets no button
 *
 * `discoverable` and `joinMode` are independent axes, so an invite-only circle
 * can legitimately appear in Discover. But `requestToJoinCircle` refuses one:
 * circle-service checks `joinMode.acceptsJoinRequests()` and throws
 * `CircleNotAcceptingJoinRequestsError`. A "Request Access" button there would
 * fail every single time it was pressed, so the row states how to get in and
 * offers no action instead of offering one that cannot work.
 */
export function DiscoverCircleRow({ circle }: DiscoverCircleRowProps) {
  const t = useTranslations('circles');
  const [requested, setRequested] = useState(false);

  const [requestToJoin, { loading }] = useMutation<RequestToJoinCircleData>(
    REQUEST_TO_JOIN_CIRCLE,
    {
      variables: { circleId: circle.id },
      onCompleted: () => setRequested(true),
      onError: () => toast.error(t('errors.join')),
    },
  );

  const canRequest = circle.joinMode === 'REQUEST';

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-default p-4">
      <div className="flex items-start gap-3">
        <CircleAvatar
          name={circle.name}
          src={toCdnUrl(circle.avatarUrl)}
          className="size-11"
        />

        <div className="min-w-0 flex-1">
          <h3 className="label-medium truncate text-text-primary">
            {circle.name}
          </h3>
          <p className="caption-small text-text-secondary">
            {t('common.memberCount', { count: circle.memberCount })}
          </p>
          {circle.tagline ? (
            <p className="caption-small mt-1 line-clamp-2 text-text-secondary">
              {circle.tagline}
            </p>
          ) : null}
          <p className="caption-small mt-1 text-text-primary">
            {canRequest ? t('index.access.apply') : t('index.access.invite')}
          </p>
        </div>
      </div>

      {canRequest ? (
        <ButtonType1
          className="mt-3 w-full"
          disabled={loading || requested}
          onClick={() => {
            void requestToJoin();
          }}
        >
          {requested ? t('index.requestSent') : t('index.requestAccess')}
        </ButtonType1>
      ) : null}
    </div>
  );
}
