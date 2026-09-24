'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { GET_USER_PROFILE, GetProfileResponse } from '@/services/gql/profile';
import { UserProfileView } from '@/components/profile/UserProfileView';

export default function FriendProfile() {
    const params = useParams();
    const userId = params.id as string;

    // Fetch user profile by userId
    const { data, loading, error, refetch } = useQuery<GetProfileResponse>(GET_USER_PROFILE, {
        variables: { userId },
        fetchPolicy: 'network-only', // Force fresh data
    });

    return (
        <UserProfileView
            result={data?.getProfile}
            loading={loading}
            error={error}
            onRefetch={refetch}
        />
    );
}
