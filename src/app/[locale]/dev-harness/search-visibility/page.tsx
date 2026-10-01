'use client';

/**
 * Search-visibility harness — the REAL Settings → Privacy "Show me in search
 * results" row, with GraphQL answered by the spec through
 * `page.route('**\/graphql')`; nothing here talks to a backend. Gated by the
 * dev-harness layout (404 in production).
 */

import SearchVisibilitySection from '@/components/settings/SearchVisibilitySection';

export default function SearchVisibilityHarness() {
    return (
        <main style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
            <p data-testid="harness-ready">ready</p>
            <div className="bg-surface-default border border-border-subtle rounded-lg p-6 space-y-4">
                <SearchVisibilitySection />
            </div>
        </main>
    );
}
