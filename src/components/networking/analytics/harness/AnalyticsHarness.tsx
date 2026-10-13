'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PageFrame from '../../PageFrame';
import AnalyticsPanel from '../AnalyticsPanel';
import { fakeAnalyticsApi, type AnalyticsCall, type AnalyticsFixtureState } from './fixtures';

const STATES: AnalyticsFixtureState[] = ['empty', 'small', 'full', 'error'];

export function AnalyticsHarness() {
  const search = useSearchParams();
  const raw = search.get('state') as AnalyticsFixtureState | null;
  const state: AnalyticsFixtureState = raw && STATES.includes(raw) ? raw : 'full';
  const [calls, setCalls] = useState<AnalyticsCall[]>([]);
  const api = useMemo(() => fakeAnalyticsApi(state, (c) => setCalls((p) => [...p, c])), [state]);
  return (
    <PageFrame shell={false}>
      <p data-testid="harness-banner" className="rounded-xl border border-dashed border-border-warning bg-surface-warning px-4 py-2 text-xs text-text-primary">
        Dev harness: fixture data, no backend. The analytics gateway is not built; this screen is switched off in production (ANALYTICS_UI_ENABLED = false). State: {state}.
      </p>
      <h1 className="text-2xl font-bold text-text-primary">Organiser: networking analytics</h1>
      <AnalyticsPanel key={state} api={api} eventTitle="Ghana Diaspora Business Summit 2030" />
      <details className="text-xs text-muted-foreground">
        <summary className="min-h-6 cursor-pointer">Calls received by the fixture backend</summary>
        <pre data-testid="harness-calls" className="mt-2 overflow-x-auto rounded-lg bg-surface-subtle p-3">{JSON.stringify(calls, null, 2)}</pre>
      </details>
    </PageFrame>
  );
}
