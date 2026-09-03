'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { ButtonType2 } from '@/components/custom/button';
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { NavigationTabs } from '@/components/profile/NavigationTabs';
import { PersonalDetails } from '@/components/profile/PersonalDetails';
import { TrustScore } from '@/components/profile/TrustScore';
import { GET_USER_PROFILE, GetProfileResponse } from '@/services/gql/profile';
import LoadingScreen from '@/components/custom/LoadingScreen';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { mapApiConnectionStatusToFriendType } from '@/lib/mapProfileConnectionStatus';

export default function FriendProfile() {
    const params = useParams();
    const userId = params.id as string;
    const t = useTranslations('profile');
    const router = useRouter();

    // Fetch user profile by userId
    const { data, loading, error, refetch } = useQuery<GetProfileResponse>(GET_USER_PROFILE, {
        variables: { userId },
        fetchPolicy: 'network-only', // Force fresh data
    });

    // Show loading screen while fetching data
    if (loading) {
        return <LoadingScreen text={'loadingProfile'} />;
    }

    // Handle error state
    if (error || !data?.getProfile.success) {
        return (
            <div className="flex items-center justify-center h-app-inner">
                <div className="text-center space-y-4">
                    <p className="text-destructive">
                        {t('userNotFound')}
                    </p>
                    <ButtonType2 onClick={() => router.back()}>
                        {t('goBack')}
                    </ButtonType2>
                </div>
            </div>
        );
    }

    const profile = data.getProfile.profile;
    const connectionId = data.getProfile.connectionId ?? '';
    const friendType = mapApiConnectionStatusToFriendType(data.getProfile.connectionStatus);

    return (
        <div className="lg:flex space-x-5 my-2 mx-2">
            {/* Left Column */}
            <div className="lg:w-[50vw] space-y-2">
                <ProfileHeader
                    userId={userId}
                    userData={profile}
                    connectionId={connectionId}
                    friendType={friendType}
                    showFriendActions={true}
                    onConnectionAction={refetch}
                />
                <NavigationTabs
                    userId={userId}
                    isOwnProfile={false}
                    userData={profile}

                />
            </div>

            {/* Right Column */}
            <div className="lg:w-[25vw] space-y-2 mb-4">
                <div className='min-h-0'>
                    <PersonalDetails
                        data={profile.updatedAt}
                    />
                </div>

                <div className='mb-5'>
                    <TrustScore
                        trustScore={profile?.trustScore}
                    />
                </div>
            </div>
        </div>
    );
}