'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquareHeart, Users, UserRound } from 'lucide-react';
import PageFrame from '../../PageFrame';
import { NetworkingHeader } from '../../NetworkingShell';
import { EVENT } from '../../harness/fixtures';
import { TONE_CLASS } from '@/components/more/MoreLinkCard';
import { btnQuiet } from '../../meetings/parts';
import FeedbackSheet from '../FeedbackSheet';
import { CIRCLE_SUBJECT, MEETING_SUBJECT, fakeFeedbackApi, parseFeedbackScenario } from './fixtures';
import type { FeedbackSubject } from '../useFeedback';

type Call = { name: string; input: unknown };

/** `/dev-harness/networking/feedback?state=empty|submitted|closed&connected=existing` */
export default function FeedbackHarness() {
  const search = useSearchParams();
  const scenario = parseFeedbackScenario(search.get('state'));
  const existing = search.get('connected') === 'existing';
  const [calls, setCalls] = useState<Call[]>([]);
  const [open, setOpen] = useState<FeedbackSubject | null>(null);
  const api = useMemo(() => fakeFeedbackApi({ scenario, connectExisting: existing, onCall: (c) => setCalls((p) => [...p, c]) }), [scenario, existing]);

  const rows: Array<{ subject: FeedbackSubject; kind: 'meeting' | 'circle'; label: string }> = [
    { subject: MEETING_SUBJECT, kind: 'meeting', label: 'Meeting with David Owusu' },
    { subject: CIRCLE_SUBJECT, kind: 'circle', label: 'Circle: Investing in African Startups' },
  ];
  return (
    <PageFrame shell={false}>
      <p data-testid="harness-banner" className="rounded-xl border border-dashed border-border-warning bg-surface-warning px-4 py-2 text-xs text-text-primary">
        Dev harness: fixture data, no backend. The feedback gateway is not deployed; these screens are switched off in production (FEEDBACK_UI_ENABLED = false). Use ?state=empty, submitted or closed.
      </p>
      <NetworkingHeader event={EVENT} title="Feedback sheets" />
      <ul className="mx-auto w-full max-w-2xl divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-surface-default">
        {rows.map((r) => (
          <li key={r.kind} className="flex flex-wrap items-center gap-3 p-4">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${r.kind === 'meeting' ? TONE_CLASS.brand : TONE_CLASS.success}`}>
              {r.kind === 'meeting' ? <UserRound className="size-5" aria-hidden /> : <Users className="size-5" aria-hidden />}
            </span>
            <p className="min-w-0 flex-1 text-sm font-medium text-text-primary">{r.label}</p>
            <button type="button" onClick={() => setOpen(r.subject)} className={btnQuiet} data-testid={`open-${r.kind}-feedback`}>
              <MessageSquareHeart className="size-4" aria-hidden />Give feedback
            </button>
          </li>
        ))}
      </ul>
      <FeedbackSheet open={Boolean(open)} onOpenChange={(o) => { if (!o) setOpen(null); }} subject={open ?? MEETING_SUBJECT} api={api} />
      <details className="text-xs text-muted-foreground">
        <summary className="min-h-6 cursor-pointer">Calls received by the fixture backend</summary>
        <pre data-testid="harness-calls" className="mt-2 overflow-x-auto rounded-lg bg-surface-subtle p-3">{JSON.stringify(calls, null, 2)}</pre>
      </details>
    </PageFrame>
  );
}
