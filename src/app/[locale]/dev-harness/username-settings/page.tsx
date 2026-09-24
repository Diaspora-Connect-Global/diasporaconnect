'use client';

/**
 * UsernameSettingsForm harness — the settings "Username" section with FAKE
 * transport, so every availability/save outcome can be driven without a
 * backend or a session. Gated by the dev-harness layout (404 in production).
 *
 * Fake server:
 *   availability — "taken…" → TAKEN, contains "admin" → RESERVED, else available
 *   save         — "racer…" → TAKEN (lost race), "soon…" → TOO_SOON, else success
 * `?locked=1` starts with the 30-day window active. `?none=1` starts with no username.
 * Calls are recorded on `window.__usernameHarness` for the spec.
 */

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import UsernameSettingsForm from '@/components/settings/UsernameSettingsForm';
import type { UpdateUsernameResult, UsernameAvailability } from '@/services/gql/types/profile';

type HarnessLog = { checks: string[]; saves: string[]; toasts: string[] };

declare global {
    interface Window {
        __usernameHarness?: HarnessLog;
    }
}

function log(): HarnessLog {
    if (!window.__usernameHarness) window.__usernameHarness = { checks: [], saves: [], toasts: [] };
    return window.__usernameHarness;
}

const IN_30_DAYS = () => new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

function Harness() {
    const params = useSearchParams();
    const [current, setCurrent] = useState<string | null>(params.get('none') ? null : 'steven');
    const [nextChangeAt] = useState<string | null>(params.get('locked') ? IN_30_DAYS() : null);

    const checkAvailability = useCallback(async (u: string): Promise<UsernameAvailability> => {
        log().checks.push(u);
        await new Promise((r) => setTimeout(r, 50));
        if (u.startsWith('taken')) return { available: false, reason: 'TAKEN' };
        if (u.includes('admin')) return { available: false, reason: 'RESERVED' };
        return { available: true, reason: null };
    }, []);

    const saveUsername = useCallback(async (u: string): Promise<UpdateUsernameResult> => {
        log().saves.push(u);
        await new Promise((r) => setTimeout(r, 50));
        if (u.startsWith('racer')) return { success: false, code: 'TAKEN', message: 'taken' };
        if (u.startsWith('soon')) {
            return { success: false, code: 'TOO_SOON', message: 'too soon', nextChangeAt: IN_30_DAYS() };
        }
        return { success: true, code: null, username: u, nextChangeAt: IN_30_DAYS() };
    }, []);

    const notify = useMemo(
        () => ({
            success: (m: string) => log().toasts.push(`ok:${m}`),
            error: (m: string) => log().toasts.push(`err:${m}`),
        }),
        [],
    );

    return (
        <div style={{ maxWidth: 672, margin: '24px auto', padding: 16 }}>
            <UsernameSettingsForm
                userId="00000000-0000-4000-8000-000000000001"
                currentUsername={current}
                nextChangeAt={nextChangeAt}
                checkAvailability={checkAvailability}
                saveUsername={saveUsername}
                onSaved={(res) => setCurrent(res.username)}
                notify={notify}
            />
        </div>
    );
}

export default function UsernameSettingsHarness() {
    return (
        <Suspense fallback={null}>
            <Harness />
        </Suspense>
    );
}
