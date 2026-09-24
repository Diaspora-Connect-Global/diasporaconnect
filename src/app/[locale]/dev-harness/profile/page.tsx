'use client';

/**
 * Own-profile harness — the profile page's header card, tabs and right-column
 * cards with seeded data, in the same two-column layout as
 * `(protected)/(main)/profile/page.tsx`, so the design can be checked without
 * signing in. Components that fetch (KYC status, the posts feed) run against
 * whatever backend is configured and fall back to their empty states.
 */

import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { NavigationTabs } from '@/components/profile/NavigationTabs';
import { ProfileCompletion } from '@/components/profile/ProfileCompletion';
import { KYCVerification } from '@/components/profile/KYCVerification';
import { PersonalDetails } from '@/components/profile/PersonalDetails';
import { TrustScore } from '@/components/profile/TrustScore';
import type { Profile } from '@/services/gql/profile';
import { useRouter, useSearchParams } from 'next/navigation';

const SAMPLE = {
    id: 'p-1',
    userId: '00000000-0000-4000-8000-000000000001',
    username: 'ama.mensah',
    email: 'ama@example.com',
    firstName: 'Ama',
    middleName: '',
    lastName: 'Mensah',
    avatarUrl: '',
    bio: 'Product designer in Brussels, originally from Kumasi. Connecting the Ghanaian diaspora with small businesses back home.',
    residenceCountry: 'BE',
    countryOfOrigin: 'GH',
    connectionCount: 10,
    trustScore: 52,
    version: 1,
    verificationStatus: 'unverified',
    createdAt: '2025-03-14T10:00:00Z',
    profileCompletion: { percentage: 45, missingSections: ['work_experience'] },
} as unknown as Profile;

export default function ProfileHarness() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const openAbout = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', 'about');
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-5 my-2 space-y-2 lg:space-y-0 mx-2 lg:mx-6 lg:my-5">
            <div className="lg:flex-1 lg:min-w-0 order-1 lg:order-none space-y-2 lg:space-y-4 flex flex-col">
                <ProfileHeader
                    userId="me"
                    friendType="friends"
                    showFriendActions={false}
                    userData={SAMPLE}
                    connectionId=""
                    onEditAvatar={() => alert('avatar dialog')}
                />
                <div className="hidden lg:block lg:order-none">
                    <NavigationTabs userId={SAMPLE.userId} isOwnProfile userData={SAMPLE} />
                </div>
            </div>

            <div className="order-3 lg:hidden">
                <NavigationTabs userId={SAMPLE.userId} isOwnProfile userData={SAMPLE} />
            </div>

            <div className="lg:w-[360px] xl:w-[380px] lg:shrink-0 space-y-2 lg:space-y-4 mb-4 order-2 lg:order-none">
                <ProfileCompletion percentage={45} onCompleteProfile={openAbout} />
                <KYCVerification verified={SAMPLE.verificationStatus} />
                <PersonalDetails data={SAMPLE.createdAt} />
                <TrustScore trustScore={SAMPLE.trustScore} />
            </div>
        </div>
    );
}
