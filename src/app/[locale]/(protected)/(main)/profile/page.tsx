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
        <div className="flex flex-col lg:flex-row lg:space-x-5 my-2 space-y-2 lg:space-y-0 h-app-inner mx-2">
            {/* Profile Header - First on mobile, part of left column on desktop */}
            <div className="lg:w-[50vw] order-1 lg:order-none space-y-2 flex flex-col">
                <ProfileHeader 
                    userId='me'  
                    friendType={currentUser.friendType}
                    showFriendActions={false} 
                />
                
                {/* Navigation Tabs - Last on mobile, after header on desktop */}
                <div className="hidden lg:block  lg:order-none">
                    <NavigationTabs
                        userId='me'
                        isOwnProfile={true}
                    />
                </div>
            </div>

            {/* Navigation Tabs - Last on mobile, after header on desktop */}
                <div className="order-3 lg:hidden">
                    <NavigationTabs
                        userId='me'
                        isOwnProfile={true}
                    />
                </div>

            {/* Right Column - Second on mobile */}
            <div className="lg:w-[25vw] space-y-2 mb-4 order-2 lg:order-none">
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