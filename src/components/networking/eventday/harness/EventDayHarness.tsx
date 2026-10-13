'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageFrame from '../../PageFrame';
import { NetworkingHeader } from '../../NetworkingShell';
import { EVENT } from '../../harness/fixtures';
import MeetingDetail from '../../meetings/MeetingDetail';
import { fakeMeetingsApi } from '../../meetings/harness/fixtures';
import { clockOffsetFor, fakeEventDayApi, locateFor, offsetClock, parseScenario, scenarioMeeting } from './fixtures';

type Call = { name: string; input: unknown };

/** `/dev-harness/networking/event-day?state=window|before|after|arrived|other-arrived|sharing|other-sharing|they-cant-find|online|geo-denied|geo-unavailable|geo-timeout&ttl=SECONDS&cooldown=SECONDS` */
export default function EventDayHarness() {
  const search = useSearchParams();
  const scenario = parseScenario(search.get('state'));
  const ttl = Number(search.get('ttl')) || undefined;
  const cooldown = Number(search.get('cooldown')) || undefined;
  const [calls, setCalls] = useState<Call[]>([]);
  const [shown, setShown] = useState(true);

  const parts = useMemo(() => {
    const log = (c: Call) => setCalls((p) => [...p, c]);
    const clock = offsetClock(clockOffsetFor(scenario));
    return {
      meeting: scenarioMeeting(scenario),
      config: {
        api: fakeEventDayApi({ scenario, clock, ttlSeconds: ttl, cooldownSeconds: cooldown, onCall: log }),
        clock,
        locate: locateFor(scenario, (name) => log({ name, input: {} })),
      },
    };
  }, [scenario, ttl, cooldown]);
  const meetingsApi = useMemo(() => fakeMeetingsApi({ initial: parts.meeting }), [parts.meeting]);

  return (
    <PageFrame shell={false}>
      <p data-testid="harness-banner" className="rounded-xl border border-dashed border-border-warning bg-surface-warning px-4 py-2 text-xs text-text-primary">
        Dev harness: fixture data, no backend. The event-day gateway is not deployed; these screens are switched off in production (EVENT_DAY_UI_ENABLED = false). The clock is set so the meeting is in the state named in the address (?state=).
      </p>
      <NetworkingHeader event={EVENT} title="Event day: meeting card" />
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border-subtle bg-surface-default p-5 sm:p-7">
        {shown && <MeetingDetail key={scenario} meeting={parts.meeting} eventId={EVENT.id} eventTitle={EVENT.title} api={meetingsApi} eventDay={parts.config} />}
      </div>
      <button type="button" onClick={() => setShown((v) => !v)} data-testid="harness-unmount" className="mx-auto min-h-11 rounded-full border border-border-subtle px-5 text-sm text-text-primary">
        {shown ? 'Leave the page (unmount the card)' : 'Come back'}
      </button>
      <details className="text-xs text-muted-foreground">
        <summary className="min-h-6 cursor-pointer">Calls received by the fixture backend</summary>
        <pre data-testid="harness-calls" className="mt-2 overflow-x-auto rounded-lg bg-surface-subtle p-3">{JSON.stringify(calls, null, 2)}</pre>
      </details>
    </PageFrame>
  );
}
