'use client';

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { NavigationTabs } from '@/components/profile/NavigationTabs';
import { PersonalDetails } from '@/components/profile/PersonalDetails';
import { ProfileCompletion } from '@/components/profile/ProfileCompletion';
import { KYCVerification } from '@/components/profile/KYCVerification';
import { TrustScore } from '@/components/profile/TrustScore';
import { DUMMY_USERS } from '@/data/users';
import { useQuery } from "@apollo/client/react";
import { GET_MY_PROFILE, GetProfileResponse, Profile } from "@/services/gql/profile";
import { toast } from "sonner";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfilePage() {
        const setUser = useAuthStore(state => state.setUser);
    // const currentUser = useAuthStore(state => state.user);




    const { data, loading, error } = useQuery<GetProfileResponse>(GET_MY_PROFILE, {
        fetchPolicy: 'cache-first', // Load from cache first, then fetch in background
        nextFetchPolicy: 'cache-and-network', // After first fetch, always check network but show cache first
        notifyOnNetworkStatusChange: false, // Don't trigger loading state on background refetch
    });      
    
    const profile: Profile | undefined = data?.getProfile.profile;

      console.log("profile info", profile)

          useEffect(() => {
        if (profile) {
            setUser({
                ...profile,
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                id: profile.userId,
                
            });
        }
    }, [profile?.firstName, profile?.lastName, profile?.email, profile, setUser]); // Only run when these specific fields change

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
                    userData={profile}               
                     />
                
                {/* Navigation Tabs - Last on mobile, after header on desktop */}
                <div className="hidden lg:block  lg:order-none">
                    <NavigationTabs
                        userId='me'
                        isOwnProfile={true}
                        userData={profile}               

                    />
                </div>
            </div>

            {/* Navigation Tabs - Last on mobile, after header on desktop */}
                <div className="order-3 lg:hidden">
                    <NavigationTabs
                        userId='me'
                        isOwnProfile={true}
                        userData={profile}
                    />
                </div>

            {/* Right Column - Second on mobile */}
            <div className="lg:w-[25vw] space-y-2 mb-4 order-2 lg:order-none">
                <div className='min-h-0'>
                    <ProfileCompletion
                        percentage={profile?.profileCompletion?.percentage}
                        onCompleteProfile={handleCompleteProfile}
                    />
                </div>

                <div className='min-h-0'>
                    <KYCVerification
                        verified={profile?.verificationStatus}
                        onVerify={handleVerifyKYC}
                    />
                </div>

                <div className='min-h-0'>
                    <PersonalDetails data={ profile?.createdAt
                    } />
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