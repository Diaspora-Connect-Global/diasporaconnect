'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import PageLoader from '@/components/custom/PageLoader';
import PageFrame from './PageFrame';
import GateMessage from './GateMessage';
import PersonView, { PersonNotFound } from './PersonView';
import { RevealConfirmDialog } from './InterestParts';
import { NetworkingHeader } from './NetworkingShell';
import MeetingRequestButton from './meetings/MeetingRequestButton';
import { useMeetingsApi } from './meetings/useMeetings';
import { useDecide, useInterestFlow, useNetworkingBase } from './useNetworking';
import { hasFailure, networkingRefusal } from '@/lib/networkingRefusal';
import { NETWORKING_FEATURES } from '@/lib/networkingFeatures';
import { NETWORKING_CONTEXT, NETWORKING_PERSON, type NetworkingPerson } from '@/services/gql/networking';

export default function NetworkingPersonPage({ eventId, handle }: { eventId: string; handle: string }) {
  const t = useTranslations('networking');
  const router = useRouter();
  const base = useNetworkingBase(eventId);
  const features = NETWORKING_FEATURES;
  const ready = base.gate === 'ready' || base.gate === 'paused';
  const meetingsApi = useMeetingsApi(eventId);
  const decide = useDecide(eventId);
  const flow = useInterestFlow(eventId, base.mine?.participation?.visibility);
  const [busy, setBusy] = useState(false);
  const q = useQuery<{ eventNetworkingPerson: NetworkingPerson | null }>(NETWORKING_PERSON, { variables: { eventId, handle }, skip: !ready || !handle, ...NETWORKING_CONTEXT });

  if (base.gate === 'loading' || (ready && q.loading && !q.data)) return <PageLoader />;
  if (!ready) {
    return (
      <PageFrame>
        <NetworkingHeader event={base.context} />
        <GateMessage state={base.gate as never} eventId={eventId} onRetry={() => void base.refetchMine()} onRejoin={() => router.push(`/events/${eventId}/networking/setup`)} />
      </PageFrame>
    );
  }
  const person = q.data?.eventNetworkingPerson ?? null;
  // ANY failure or empty answer is the same screen: a hidden, blocked or missing person must be indistinguishable.
  if (!person || hasFailure(q)) {
    const r = hasFailure(q) ? networkingRefusal(q) : null;
    return (
      <PageFrame>
        <NetworkingHeader event={base.context} />
        {r && r.kind === 'unavailableYet' ? <GateMessage state="unavailableYet" eventId={eventId} /> : <PersonNotFound eventId={eventId} />}
      </PageFrame>
    );
  }

  const act = (fn: () => Promise<boolean>, message?: string) => async () => {
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    if (ok) {
      if (message) toast.success(message);
      router.push(`/events/${eventId}/networking/recommended`);
    }
  };

  return (
    <PageFrame>
      <RevealConfirmDialog open={Boolean(flow.pending)} name={flow.pending?.name} sending={flow.sending} onConfirm={() => void flow.confirm()} onCancel={flow.cancel} />
      <PersonView
        event={base.context}
        features={features}
        person={person}
        me={base.me}
        labelOf={base.labelOf}
        busy={busy}
        onPass={act(() => decide(person.handle, 'PASS'), t('person.passed'))}
        onSkip={act(() => decide(person.handle, 'SKIP'), t('person.saved'))}
        eventId={eventId}
        onBlocked={features.interests ? () => router.push(`/events/${eventId}/networking?tab=people`) : undefined}
        onInterested={features.interests ? act(() => flow.express(person.handle, 'PERSON', person.displayName ?? '')) : undefined}
        meetingAction={
          features.meetings && !person.isSelf ? (
            <MeetingRequestButton person={person} api={meetingsApi} hiddenSender={base.mine?.participation?.visibility === 'HIDDEN'} variant="quiet" />
          ) : undefined
        }
      />
    </PageFrame>
  );
}
