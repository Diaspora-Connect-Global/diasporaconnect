'use client';

/**
 * Daily Summary card harness — the group-chat digest card with SAMPLE data, so
 * the layout (desktop + mobile), the no-user-id rule and the "View messages"
 * wiring can be checked without a backend. Gated by the dev-harness layout
 * (404 in production).
 *
 *   (default)     topic bulletins + key points + decisions + action items
 *   ?legacy=1     an older digest with no topics (fallback layout)
 *   ?system=1     the plain-text SYSTEM message body, parsed into the card
 *
 * The sample text deliberately contains user ids (a UUID, an 8-char fragment,
 * an erasure tombstone, an id-shaped participant name) — none may render.
 * "View messages" calls are recorded on `window.__dailySummaryHarness`.
 */

import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DailySummaryCard } from '@/components/chats/DailySummaryCard';
import { parseDigestBody } from '@/lib/dailySummary';
import type { ChatSummaryTopic } from '@/services/gql/types/messaging';

type HarnessLog = { views: string[][] };

declare global {
    interface Window {
        __dailySummaryHarness?: HarnessLog;
    }
}

const LEAKED_ID = '3f9a2b1c-4d5e-4f60-8a7b-9c3d1e2f5a6b';

const TOPICS: ChatSummaryTopic[] = [
    {
        title: 'Community picnic on Saturday',
        summary: `Ama proposed Legon botanical gardens; ${LEAKED_ID} offered to bring drinks and the group agreed on a 10am start.`,
        participants: [
            { userId: 'u-ama', displayName: 'Ama Owusu' },
            { userId: 'u-kofi', displayName: 'Kofi Mensah' },
            { userId: LEAKED_ID, displayName: LEAKED_ID },
        ],
        messageIds: ['m-101', 'm-104', 'm-109'],
    },
    {
        title: 'Visa appointment tips',
        summary: 'User 9c3d1e2f shared that the embassy now accepts online bookings only; Efua asked about document translations.',
        participants: [
            { userId: 'u-efua', displayName: 'Efua Boateng' },
            { userId: 'u-x', displayName: '' },
        ],
        messageIds: ['m-120'],
    },
];

const SYSTEM_BODY = [
    'Daily summary · 2026-09-23',
    `A busy day: plans for the picnic and a question from deleted-user:a1b2c3d4e5f6 about visas.`,
    '- Picnic moves to Saturday 10am',
    `- ${LEAKED_ID} will bring drinks`,
    'Action items:',
    '- Ama to book the pavilion',
    '(Based on 42 messages.)',
].join('\n');

function Harness() {
    const params = useSearchParams();
    const [last, setLast] = useState<string>('');

    const onViewMessages = useCallback((ids: string[]) => {
        if (!window.__dailySummaryHarness) window.__dailySummaryHarness = { views: [] };
        window.__dailySummaryHarness.views.push(ids);
        setLast(ids.join(','));
    }, []);

    let card: React.ReactNode;
    if (params.get('system')) {
        const parsed = parseDigestBody(SYSTEM_BODY);
        card = (
            <DailySummaryCard
                digestDate={parsed?.digestDate}
                messageCount={parsed?.messageCount}
                overview={parsed?.overview}
                keyPoints={parsed?.keyPoints}
                actionItems={parsed?.actionItems}
                timestamp="5:26 PM"
            />
        );
    } else {
        const legacy = !!params.get('legacy');
        card = (
            <DailySummaryCard
                digestDate="2026-09-23"
                messageCount={42}
                overview={`Plans for the weekend picnic and advice on visa appointments, with input from ${LEAKED_ID}.`}
                topics={legacy ? [] : TOPICS}
                keyPoints={['Picnic confirmed for Saturday', `Drinks covered by ${LEAKED_ID}`]}
                decisions={legacy ? [] : ['Meet at the main gate at 10am']}
                actionItems={['Ama to book the pavilion']}
                onViewMessages={onViewMessages}
                timestamp="5:26 PM"
            />
        );
    }

    return (
        <main className="min-h-screen bg-bg-secondary p-4 sm:p-8">
            <div className="mx-auto flex max-w-2xl justify-center">{card}</div>
            <p data-testid="harness-last-view" className="sr-only">
                {last}
            </p>
        </main>
    );
}

export default function DailySummaryHarnessPage() {
    return (
        <Suspense fallback={null}>
            <Harness />
        </Suspense>
    );
}
