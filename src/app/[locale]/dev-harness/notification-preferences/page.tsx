'use client';

/**
 * Notification-preferences harness — the REAL Settings → Notifications section
 * (email / SMS / push), with GraphQL answered by the spec through
 * `page.route('**\/graphql')`; nothing here talks to a backend. Gated by the
 * dev-harness layout (404 in production).
 */

import NotificationPreferencesSection from '@/components/settings/NotificationPreferencesSection';

export default function NotificationPreferencesHarness() {
    return (
        <main style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
            <p data-testid="harness-ready">ready</p>
            <NotificationPreferencesSection />
        </main>
    );
}
