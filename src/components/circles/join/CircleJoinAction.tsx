'use client';

import { useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ButtonType1 } from '@/components/custom/button';
import { readMutationOutcome } from '@/lib/mutationOutcome';
import { CIRCLE_JOIN, REQUEST_TO_JOIN_CIRCLE } from '@/services/gql/circles';
import type {
  CircleJoinData,
  CircleJoinMode,
  RequestToJoinCircleData,
} from '@/services/gql/types/circles';

import { readCircleJoin, readCircleJoinThrown } from './circleJoinOutcome';

export interface CircleJoinActionProps {
  circleId: string;
  joinMode: CircleJoinMode;
  /** Active queries to refetch once the viewer is in (named operations). */
  refetch?: string[];
  /** Called after a confirmed `circleJoin` success. */
  onJoined?: () => void;
  className?: string;
}

/**
 * The one place a non-member acts on how a circle lets people in.
 *
 *   OPEN         "Join circle"  → `circleJoin`; the viewer is a member at once.
 *   REQUEST      "Request Access" → `requestToJoinCircle` (a request, not a seat).
 *   INVITE_ONLY  no action exists, so only the explanation is shown.
 *
 * `errorPolicy: 'all'` makes a refused mutation RESOLVE with `data: null`, so
 * success is read from the data (`readCircleJoin` / `readMutationOutcome`),
 * never from "the promise did not throw". A refusal shows its own translated
 * message by `extensions.code`; the server's wording is never rendered.
 */
export function CircleJoinAction({
  circleId,
  joinMode,
  refetch = ['MyCircles', 'SearchCircles'],
  onJoined,
  className = 'w-full',
}: CircleJoinActionProps) {
  const t = useTranslations('circles');
  const client = useApolloClient();
  const [requested, setRequested] = useState(false);
  const [joined, setJoined] = useState(false);

  const [join, { loading: joining }] = useMutation<CircleJoinData>(CIRCLE_JOIN, {
    refetchQueries: refetch,
    awaitRefetchQueries: true,
  });
  const [requestToJoin, { loading: requesting }] =
    useMutation<RequestToJoinCircleData>(REQUEST_TO_JOIN_CIRCLE);

  const handleJoin = async () => {
    if (joining || joined) return;
    let outcome;
    try {
      outcome = readCircleJoin(await join({ variables: { circleId } }));
    } catch (error) {
      outcome = readCircleJoinThrown(error);
    }
    if (!outcome.ok) {
      toast.error(t(`join.openErrors.${outcome.code}`));
      return;
    }
    setJoined(true);
    toast.success(t('join.openJoined'));
    onJoined?.();
  };

  const handleRequest = async () => {
    try {
      const result = await requestToJoin({ variables: { circleId } });
      const outcome = readMutationOutcome(result, (d) => d?.requestToJoinCircle);
      if (!outcome.ok) {
        // The circle switched to OPEN since this page loaded: show "Join circle".
        const refusal = readCircleJoin({ data: null, error: result.error });
        if (!refusal.ok && refusal.code === 'CIRCLE_IS_OPEN') {
          toast.error(t('join.openErrors.CIRCLE_IS_OPEN'));
          void client.refetchQueries({ include: refetch });
          return;
        }
        toast.error(t('errors.join'));
        return;
      }
      setRequested(true);
    } catch {
      toast.error(t('errors.join'));
    }
  };

  if (joinMode === 'OPEN') {
    return (
      <ButtonType1
        className={className}
        disabled={joining || joined}
        onClick={() => void handleJoin()}
      >
        {joined ? t('index.joined') : joining ? t('index.joining') : t('index.joinCircle')}
      </ButtonType1>
    );
  }

  if (joinMode === 'REQUEST') {
    return (
      <ButtonType1
        className={className}
        disabled={requesting || requested}
        onClick={() => void handleRequest()}
      >
        {requested ? t('index.requestSent') : t('index.requestAccess')}
      </ButtonType1>
    );
  }

  return (
    <p className="caption-small flex h-9 items-center justify-center text-text-secondary">
      {t('index.access.invite')}
    </p>
  );
}
