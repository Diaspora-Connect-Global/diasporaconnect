'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ButtonType1 } from '@/components/custom/button';
import { toCdnUrl } from '@/lib/cdn';
import { readMutationOutcome } from '@/lib/mutationOutcome';
import { REQUEST_TO_JOIN_CIRCLE } from '@/services/gql/circles';
import type {
  CirclePublicCard,
  RequestToJoinCircleData,
} from '@/services/gql/types/circles';

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
  const [requested, setRequested] = useState(false);

  const [requestToJoin, { loading }] = useMutation<RequestToJoinCircleData>(
    REQUEST_TO_JOIN_CIRCLE,
    { variables: { circleId: circle.id } },
  );

  const canRequest = circle.joinMode === 'REQUEST';

  /*
   * `graph-client.ts` sets `errorPolicy: 'all'` globally for mutations, so a
   * REFUSED request resolves with `{ data: null }` rather than throwing. The
   * old `onCompleted` here therefore flipped the label to "Request sent" for
   * refusals too — telling someone they had applied when circle-service had
   * turned them down. `readMutationOutcome` is the check that `data` came back.
   */
  const handleRequest = async () => {
    try {
      const result = await requestToJoin();
      const outcome = readMutationOutcome(
        result,
        (d) => d?.requestToJoinCircle,
      );
      if (!outcome.ok) {
        toast.error(t('errors.join'));
        return;
      }
      setRequested(true);
    } catch {
      // A link-level throw or an aborted request still rejects.
      toast.error(t('errors.join'));
    }
  };

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
            {canRequest
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
        {canRequest ? (
          <ButtonType1
            className="w-full"
            disabled={loading || requested}
            onClick={() => {
              void handleRequest();
            }}
          >
            {requested ? t('index.requestSent') : t('index.requestAccess')}
          </ButtonType1>
        ) : (
          /*
            Invite-only: no action exists, so the space keeps the same height as
            a button rather than collapsing and pulling the tile out of line.
          */
          <p className="caption-small flex h-9 items-center justify-center text-text-secondary">
            {t('index.access.invite')}
          </p>
        )}
      </div>
    </div>
  );
}
