'use client';

import { useRouter } from 'next/navigation';
import PageLoader from '@/components/custom/PageLoader';
import PageFrame from '../PageFrame';
import GateMessage from '../GateMessage';
import { NetworkingHeader } from '../NetworkingShell';
import { useNetworkingBase } from '../useNetworking';
import ScheduleView from './ScheduleView';
import { useMeetingsApi, useMySchedule } from './useMeetings';
import { NETWORKING_FEATURES } from '@/lib/networkingFeatures';

/** `/events/[id]/schedule` — the real page. Queries run only while the meetings UI is released. */
export default function SchedulePage({ eventId }: { eventId: string }) {
  const router = useRouter();
  const base = useNetworkingBase(eventId);
  const api = useMeetingsApi(eventId);
  const ready = base.gate === 'ready' || base.gate === 'paused';
  const q = useMySchedule(eventId, NETWORKING_FEATURES.meetings && ready);
  if (base.gate === 'loading') return <PageLoader />;
  if (!ready) {
    return (
      <PageFrame>
        <NetworkingHeader event={base.context} />
        <GateMessage state={base.gate as never} eventId={eventId} onRetry={() => void base.refetchMine()} onRejoin={() => router.push(`/events/${eventId}/networking/setup`)} />
      </PageFrame>
    );
  }
  return (
    <PageFrame>
      <ScheduleView event={base.context} schedule={q.schedule} loading={q.loading} failureKey={q.failureKey} api={api} onChanged={q.reload} />
    </PageFrame>
  );
}
