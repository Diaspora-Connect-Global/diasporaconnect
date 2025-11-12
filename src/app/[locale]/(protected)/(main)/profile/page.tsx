'use client';

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { NavigationTabs } from '@/components/profile/NavigationTabs';
import { PersonalDetails } from '@/components/profile/PersonalDetails';
import { ProfileCompletion } from '@/components/profile/ProfileCompletion';
import { KYCVerification } from '@/components/profile/KYCVerification';
import { TrustScore } from '@/components/profile/TrustScore';
import { DUMMY_USERS } from '@/data/users';

export default function Profile() {
    // Get current user data (user with ID 'me')
    const currentUser = DUMMY_USERS['me'];

    function handleVerifyKYC(): void {
        throw new Error('Function not implemented.');
    }

    function handleCompleteProfile(): void {
        throw new Error('Function not implemented.');
    }

    return (
        <div className="flex space-x-5 my-2">
            {/* Left Column */}
            <div className="lg:w-[50vw] space-y-2">
                <ProfileHeader 
                    userId='me'  
                    friendType={currentUser.friendType}
                    showFriendActions={false} 
                />
                <NavigationTabs
                    userId='me'
                    isOwnProfile={true}
                />
            </div>

            {/* Right Column */}
            <div className="lg:w-[25vw] space-y-2 mb-4">
                <div className='min-h-0'>
                    <ProfileCompletion
                        percentage={currentUser.percentageCompletion}
                        onCompleteProfile={handleCompleteProfile}
                    />
                </div>

                <div className='min-h-0'>
                    <KYCVerification
                        verified={currentUser.kycVerified}
                        onVerify={handleVerifyKYC}
                    />
                </div>

                <div className='min-h-0'>
                    <PersonalDetails data={{ 
                        joinDate: currentUser.joinDate,
                    }} />
                </div>

                <div className='min-h-0'>
                    <TrustScore
                        trustScore={currentUser.trustScore}
                    />
                </div>
            </div>
        </div>
    );
}