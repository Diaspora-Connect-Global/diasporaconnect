'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageFrame from '../../PageFrame';
import { NetworkingHeader, NetworkingTabs } from '../../NetworkingShell';
import { EVENT } from '../../harness/fixtures';
import MeetingRequestButton from '../MeetingRequestButton';
import MeetingDetail from '../MeetingDetail';
import MeetingsPanel from '../MeetingsPanel';
import ScheduleView from '../ScheduleView';
import MeetingSettingsEditor from '../MeetingSettingsEditor';
import { FILTER_STATUSES, PEOPLE, SCHEDULE_ITEMS, SETTINGS, fakeMeetingsApi, fixtureList, fixtureMeeting, type FixtureState } from './fixtures';
import type { MeetingFilter, MeetingCounts } from '@/services/gql/networkingMeetings';

function Banner() {
  return (
    <p data-testid="harness-banner" className="rounded-xl border border-dashed border-border-warning bg-surface-warning px-4 py-2 text-xs text-text-primary">
      Dev harness: fixture data, no backend. The meetings gateway is not deployed; these screens are switched off in production (MEETINGS_UI_ENABLED = false).
    </p>
  );
}

export function RequestHarness() {
  const search = useSearchParams();
  const { api, calls } = useFakeApi({ slotTakenOnce: search.get('taken') === '1', empty: search.get('empty') === '1' }, [search]);
  const person = PEOPLE.david;
  return (
    <PageFrame shell={false}>
      <Banner />
      <NetworkingHeader event={EVENT} title="Meetings: request a meeting" />
      <article data-testid="harness-person" className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-subtle bg-surface-default p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-text-primary">{person.displayName}</h2>
          <p className="text-sm text-muted-foreground">{person.headline}</p>
        </div>
        <div className="flex w-full max-w-xs"><MeetingRequestButton person={person} api={api} hiddenSender={search.get('hidden') === '1'} /></div>
      </article>
      <HarnessCalls calls={calls} />
    </PageFrame>
  );
}

type Call = { name: string; input: unknown };

/** The fixture backend plus the list of what it received: a reviewer (and the specs) can see the exact request. */
function useFakeApi(opts: Parameters<typeof fakeMeetingsApi>[0] = {}, deps: unknown[] = []) {
  const [calls, setCalls] = useState<Call[]>([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const api = useMemo(() => fakeMeetingsApi({ ...opts, onCall: (c) => setCalls((p) => [...p, c]) }), deps);
  return { api, calls };
}

function HarnessCalls({ calls }: { calls: Call[] }) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="min-h-6 cursor-pointer">Calls received by the fixture backend</summary>
      <pre data-testid="harness-calls" className="mt-2 overflow-x-auto rounded-lg bg-surface-subtle p-3">{JSON.stringify(calls, null, 2)}</pre>
    </details>
  );
}

export function DetailHarness() {
  const search = useSearchParams();
  const state = (search.get('state') as FixtureState) || 'requested-in';
  const initial = useMemo(() => fixtureMeeting(state), [state]);
  const { api, calls } = useFakeApi({ initial }, [initial]);
  return (
    <PageFrame shell={false}>
      <Banner />
      <NetworkingHeader event={EVENT} title="Meetings: meeting detail" />
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border-subtle bg-surface-default p-5 sm:p-7">
        <MeetingDetail key={state} meeting={initial} eventId={EVENT.id} eventTitle={EVENT.title} api={api} />
      </div>
      <HarnessCalls calls={calls} />
    </PageFrame>
  );
}

export function TabHarness() {
  const search = useSearchParams();
  const [filter, setFilter] = useState<MeetingFilter>(((search.get('f') ?? '').toUpperCase() as MeetingFilter) || 'PENDING');
  const [shown, setShown] = useState(search.get('empty') === '1' ? 0 : 2);
  const all = useMemo(() => {
    // Enough rows per tab to exercise "Load more".
    const base = fixtureList();
    return base.flatMap((m, i) => [m, { ...m, meetingId: `${m.meetingId}-b${i}` }, { ...m, meetingId: `${m.meetingId}-c${i}` }]);
  }, []);
  const { api } = useFakeApi({ initial: fixtureMeeting('requested-in') });
  const rows = search.get('empty') === '1' ? [] : all.filter((m) => FILTER_STATUSES[filter].includes(m.status));
  const counts: MeetingCounts = {
    pending: all.filter((m) => m.status === 'REQUESTED').length,
    upcoming: all.filter((m) => m.status === 'CONFIRMED').length,
    alternatives: all.filter((m) => m.status === 'ALT_PROPOSED' || m.status === 'RESCHEDULE_PROPOSED').length,
    completed: all.filter((m) => m.status === 'COMPLETED').length,
    cancelled: all.filter((m) => m.status === 'CANCELLED').length,
    awaitingMe: all.filter((m) => m.awaitingMe).length,
  };
  const limit = Math.max(2, shown);
  return (
    <PageFrame shell={false}>
      <Banner />
      <NetworkingHeader event={EVENT} />
      <NetworkingTabs eventId={EVENT.id} active="meetings" interests circles meetings />
      <MeetingsPanel
        eventId={EVENT.id}
        eventTitle={EVENT.title}
        filter={filter}
        onFilter={(f) => { setFilter(f); setShown(2); }}
        counts={counts}
        meetings={rows.slice(0, limit)}
        loading={false}
        loaded
        hasMore={rows.length > limit}
        failureKey={null}
        onLoadMore={() => setShown(limit + 2)}
        onChanged={() => {}}
        api={api}
      />
    </PageFrame>
  );
}

export function ScheduleHarness() {
  const search = useSearchParams();
  const { api } = useFakeApi({ initial: fixtureMeeting('confirmed') });
  const schedule = useMemo(() => (search.get('empty') === '1' ? { ...SCHEDULE_ITEMS(false), items: [] } : SCHEDULE_ITEMS(search.get('circles') === '1')), [search]);
  return (
    <PageFrame shell={false}>
      <Banner />
      <ScheduleView event={EVENT} schedule={schedule} loading={false} failureKey={null} api={api} onChanged={() => {}} />
    </PageFrame>
  );
}

export function SettingsHarness() {
  const search = useSearchParams();
  const [saved, setSaved] = useState<unknown>(null);
  return (
    <PageFrame shell={false}>
      <Banner />
      <h1 className="text-2xl font-bold text-text-primary">Organiser: meeting settings</h1>
      <MeetingSettingsEditor
        settings={SETTINGS}
        onSave={async (input) => {
          setSaved(input);
          if (search.get('conflict') === '1') return { ok: false, code: 'EVENT_NETWORKING_CONFLICT', key: 'conflict' };
          return { ok: true };
        }}
      />
      <pre data-testid="harness-saved" className="overflow-x-auto rounded-lg bg-surface-subtle p-3 text-xs">{saved ? JSON.stringify(saved, null, 2) : ''}</pre>
    </PageFrame>
  );
}

