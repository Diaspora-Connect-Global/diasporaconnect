'use client';

/**
 * Locked-community harness — the REAL community detail page, mounted on a route
 * whose `[id]` param stands in for the community id. GraphQL is answered by the
 * spec (page.route); nothing here talks to a backend.
 */

import { Suspense } from 'react';
import CommunityDetailClient from '@/app/[locale]/(public)/community/[id]/CommunityDetailClient';

export default function CommunityGateHarness() {
    return (
        <Suspense fallback={null}>
            <div data-testid="harness-ready">
                <CommunityDetailClient />
            </div>
        </Suspense>
    );
}
