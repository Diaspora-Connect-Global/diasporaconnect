'use client';

/**
 * Locked-association harness — the REAL association detail page, mounted on a
 * route whose `[id]` param stands in for the association id. GraphQL is answered
 * by the spec (page.route).
 */

import { Suspense } from 'react';
import AssociationDetailClient from '@/app/[locale]/(public)/association/[id]/AssociationDetailClient';

export default function AssociationGateHarness() {
    return (
        <Suspense fallback={null}>
            <div data-testid="harness-ready">
                <AssociationDetailClient />
            </div>
        </Suspense>
    );
}
