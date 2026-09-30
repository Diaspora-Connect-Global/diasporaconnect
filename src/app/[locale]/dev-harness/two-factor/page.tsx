'use client';

/**
 * Two-factor harness — the REAL Settings 2FA section (`?view=settings`) and
 * the REAL sign-in form (`?view=signin`, the default) with GraphQL answered by
 * the spec through `page.route('**\/graphql')`; nothing here talks to a
 * backend. The sign-in view also accepts the OAuth hand-off exactly as the
 * callback page leaves it (`?view=signin&oauth2fa=1` + the token in
 * sessionStorage). Gated by the dev-harness layout (404 in production).
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TwoFactorSection from '@/components/settings/TwoFactorSection';
import SignInForm from '@/components/signin/SignInForm';

function Harness() {
    const params = useSearchParams();
    const view = params.get('view') === 'settings' ? 'settings' : 'signin';

    return (
        <main style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
            <p data-testid="harness-ready">ready</p>
            {view === 'settings' ? (
                <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4">
                    <TwoFactorSection />
                </div>
            ) : (
                <SignInForm />
            )}
        </main>
    );
}

export default function TwoFactorHarness() {
    return (
        <Suspense fallback={null}>
            <Harness />
        </Suspense>
    );
}
