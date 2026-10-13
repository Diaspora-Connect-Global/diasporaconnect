'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageFrame from '../../PageFrame';
import { NetworkingHeader, NetworkingTabs } from '../../NetworkingShell';
import { EVENT } from '../../harness/fixtures';
import RecapView from '../RecapView';
import { fakeFeedbackApi, parseRecapScenario, recapFixture } from '../../feedback/harness/fixtures';

type Call = { name: string; input: unknown };

/** `/dev-harness/networking/recap?state=default|empty|member|pending|closed|caught-up|many` */
export default function RecapHarness() {
  const search = useSearchParams();
  const scenario = parseRecapScenario(search.get('state'));
  const [calls, setCalls] = useState<Call[]>([]);
  const recap = useMemo(() => recapFixture(scenario), [scenario]);
  const api = useMemo(() => fakeFeedbackApi({ scenario: 'empty', onCall: (c) => setCalls((p) => [...p, c]) }), []);
  return (
    <PageFrame shell={false}>
      <p data-testid="harness-banner" className="rounded-xl border border-dashed border-border-warning bg-surface-warning px-4 py-2 text-xs text-text-primary">
        Dev harness: fixture data, no backend. The recap gateway is not deployed; this tab is switched off in production (FEEDBACK_UI_ENABLED = false). Use ?state=default, empty, member, pending, closed, caught-up or many.
      </p>
      <NetworkingHeader event={EVENT} />
      <NetworkingTabs eventId={EVENT.id} active="recap" interests circles={false} meetings recap />
      <RecapView key={scenario} recap={recap} api={api} />
      <details className="text-xs text-muted-foreground">
        <summary className="min-h-6 cursor-pointer">Calls received by the fixture backend</summary>
        <pre data-testid="harness-calls" className="mt-2 overflow-x-auto rounded-lg bg-surface-subtle p-3">{JSON.stringify(calls, null, 2)}</pre>
      </details>
    </PageFrame>
  );
}
