'use client';

/**
 * Profile by username — the target of the `/@username` rewrite.
 *
 * Users never see `/u/...`: `src/proxy.ts` rewrites `/@steven` and
 * `/{locale}/@steven` to `/{locale}/u/steven` INTERNALLY, so the address bar
 * keeps `/@steven`. Renders exactly what the by-id route (`../[id]`) renders,
 * including for your own username (that route does not redirect to /profile
 * either), via the shared UserProfileView.
 */

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import {
    GET_PROFILE_BY_USERNAME,
    type GetProfileByUsernameResponse,
} from '@/services/gql/profile';
import { UserProfileView, UserProfileNotFound } from '@/components/profile/UserProfileView';
import { normalizeUsername, USERNAME_MAX_LENGTH } from '@/lib/username';

function decodeParam(raw: string | string[] | undefined): string {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) return '';
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export default function ProfileByUsernamePage() {
    const params = useParams();
    const username = normalizeUsername(decodeParam(params.username));
    // Deliberately LOOSER than validateUsername(): that encodes the rules for
    // choosing a NEW name, and a handle issued under older rules must still
    // resolve. Only a string no handle could ever be skips the round trip.
    const plausible =
        username.length > 0 &&
        username.length <= USERNAME_MAX_LENGTH &&
        /^[a-z0-9_.]+$/.test(username);

    const { data, loading, error, refetch } = useQuery<GetProfileByUsernameResponse>(
        GET_PROFILE_BY_USERNAME,
        {
            variables: { username },
            skip: !plausible,
            fetchPolicy: 'network-only',
        },
    );

    if (!plausible) return <UserProfileNotFound />;

    return (
        <UserProfileView
            result={data?.profileByUsername}
            loading={loading}
            error={error}
            onRefetch={refetch}
        />
    );
}
