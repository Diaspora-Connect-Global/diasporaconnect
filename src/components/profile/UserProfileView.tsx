'use client';

/**
 * Another user's profile page body, shared by the two routes that show it:
 *   - `/[locale]/(protected)/(main)/[id]`          — by user id (legacy links)
 *   - `/[locale]/(protected)/(main)/u/[username]`  — by username, reached via
 *     the `/@username` rewrite in `src/proxy.ts`
 *
 * The routes differ only in HOW they load the profile; loading, the not-found
 * state and the rendered view are identical, which is why they live here.
 */

import { ButtonType2 } from '@/components/custom/button';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { NavigationTabs } from '@/components/profile/NavigationTabs';
import { PersonalDetails } from '@/components/profile/PersonalDetails';
import { TrustScore } from '@/components/profile/TrustScore';
import LoadingScreen from '@/components/custom/LoadingScreen';
import type { GetProfileResponse } from '@/services/gql/profile';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { mapApiConnectionStatusToFriendType } from '@/lib/mapProfileConnectionStatus';
import { useUserStore } from '@/store/useUserStore';
import { useEffect } from 'react';

type ProfilePayload = GetProfileResponse['getProfile'];

export interface UserProfileViewProps {
    /** The `getProfile` / `profileByUsername` payload (same shape). */
    result: ProfilePayload | null | undefined;
    loading: boolean;
    error?: unknown;
    /** Re-run the route's query after a connection action. */
    onRefetch: () => unknown;
}

export function UserProfileNotFound() {
    const t = useTranslations('profile');
    const router = useRouter();
    return (
        <div className="flex items-center justify-center h-app-inner">
            <div className="text-center space-y-4">
                <p className="text-destructive">{t('userNotFound')}</p>
                <ButtonType2 onClick={() => router.back()}>{t('goBack')}</ButtonType2>
            </div>
        </div>
    );
}

export function UserProfileView({ result, loading, error, onRefetch }: UserProfileViewProps) {
    const router = useRouter();
    const currentUserId = useUserStore((s) => s.user?.userId);
    const viewedUserId = result?.success ? result.profile?.userId : undefined;
    // Opening your own share link (`/@you` or `/<your id>`) must not render you
    // as a stranger with an "Add friend" button — send you to your own profile,
    // which carries the owner-only controls (edit, share, avatar) this view lacks.
    const isSelf = !!currentUserId && !!viewedUserId && currentUserId === viewedUserId;

    useEffect(() => {
        if (isSelf) router.replace('/profile');
    }, [isSelf, router]);

    if (loading || isSelf) {
        return <LoadingScreen text={'loadingProfile'} />;
    }

    // `success` is checked explicitly: the gateway answers an unknown user with
    // `{ success: false }` rather than an error, and errorPolicy may also hand us
    // `null` data without throwing.
    if (error || !result?.success || !result.profile) {
        return <UserProfileNotFound />;
    }

    const profile = result.profile;
    const userId = profile.userId;
    const connectionId = result.connectionId ?? '';
    const friendType = mapApiConnectionStatusToFriendType(result.connectionStatus);

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
                    onConnectionAction={onRefetch}
                />
                <NavigationTabs userId={userId} isOwnProfile={false} userData={profile} />
            </div>

            {/* Right Column */}
            <div className="lg:w-[25vw] space-y-2 mb-4">
                <div className="min-h-0">
                    <PersonalDetails data={profile.updatedAt} />
                </div>

                <div className="mb-5">
                    <TrustScore trustScore={profile?.trustScore} />
                </div>
            </div>
        </div>
    );
}
