'use client';

/**
 * AccountMenuPanel harness — the header avatar's account panel on its own,
 * with a seeded user, so it can be opened and inspected without signing in.
 */

import { useEffect } from 'react';
import { AccountMenuPanel } from '@/components/custom/AccountMenuPanel';
import { useUserStore } from '@/store/useUserStore';
import type { Profile } from '@/services/gql/profile';

export default function AccountMenuHarness() {
    const setUser = useUserStore((s) => s.setUser);

    useEffect(() => {
        setUser({
            userId: '00000000-0000-4000-8000-000000000001',
            email: 'stephen@example.com',
            firstName: 'Stephen',
            middleName: 'Ser',
            lastName: 'Bedzrah',
            avatarUrl: '',
            connectionCount: 0,
        } as unknown as Profile);
    }, [setUser]);

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 16 }}>
            <AccountMenuPanel />
        </div>
    );
}
