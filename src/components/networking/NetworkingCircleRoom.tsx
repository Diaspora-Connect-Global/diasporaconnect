'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import PageLoader from '@/components/custom/PageLoader';
import PageFrame from './PageFrame';
import GateMessage from './GateMessage';
import { CircleRoom } from './CirclesParts';
import { NetworkingHeader } from './NetworkingShell';
import { PersonNotFound } from './PersonView';
import { useNetworkingBase, useReportRefusal } from './useNetworking';
import { hasFailure } from '@/lib/networkingRefusal';
import {
  NETWORKING_CIRCLE,
  NETWORKING_CIRCLE_LEAVE,
  NETWORKING_CIRCLE_MESSAGES,
  NETWORKING_CIRCLE_SEND,
  NETWORKING_CONTEXT,
  NETWORKING_MUTATION,
  type CircleDetail,
  type CircleMessage,
} from '@/services/gql/networking';

/** Wiring for the circle room. PENDING backend: only reachable while CIRCLES_UI_ENABLED. */
export default function NetworkingCircleRoom({ eventId, circleId }: { eventId: string; circleId: string }) {
  const router = useRouter();
  const base = useNetworkingBase(eventId);
  const report = useReportRefusal();
  const ready = base.gate === 'ready' || base.gate === 'paused';
  const circle = useQuery<{ networkingCircle: CircleDetail | null }>(NETWORKING_CIRCLE, { variables: { eventId, circleId }, skip: !ready, ...NETWORKING_CONTEXT });
  const msgs = useQuery<{ networkingCircleMessages: { messages: CircleMessage[] | null } | null }>(NETWORKING_CIRCLE_MESSAGES, { variables: { eventId, circleId }, skip: !ready, pollInterval: ready ? 15000 : 0, ...NETWORKING_CONTEXT });
  const [send] = useMutation(NETWORKING_CIRCLE_SEND, NETWORKING_MUTATION);
  const [leave] = useMutation(NETWORKING_CIRCLE_LEAVE, NETWORKING_MUTATION);

  if (base.gate === 'loading' || (ready && circle.loading && !circle.data)) return <PageLoader />;
  if (!ready) {
    return (
      <PageFrame>
        <NetworkingHeader event={base.context} />
        <GateMessage state={base.gate as never} eventId={eventId} />
      </PageFrame>
    );
  }
  const detail = circle.data?.networkingCircle ?? null;
  if (!detail || hasFailure(circle)) return <PageFrame><NetworkingHeader event={base.context} /><PersonNotFound eventId={eventId} /></PageFrame>;

  return (
    <PageFrame>
      <CircleRoom
        eventId={eventId}
        circle={detail}
        timeZone={base.event?.timezone}
        messages={msgs.data?.networkingCircleMessages?.messages ?? []}
        onSend={async (body) => {
          const r = await send({ variables: { eventId, circleId, body } });
          if (hasFailure(r)) report(r);
          else void msgs.refetch();
        }}
        onLeave={async () => {
          const r = await leave({ variables: { eventId, circleId } });
          if (hasFailure(r)) report(r);
          else router.push(`/events/${eventId}/networking?tab=circles`);
        }}
      />
    </PageFrame>
  );
}
