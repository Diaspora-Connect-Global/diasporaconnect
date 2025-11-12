'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { NavigationTabs } from '@/components/profile/NavigationTabs';
import { PersonalDetails } from '@/components/profile/PersonalDetails';
import { TrustScore } from '@/components/profile/TrustScore';
import { FriendType } from '@/components/friends/TypeOfFriend';
import { DUMMY_USERS } from '@/data/users';



export default function FriendProfile() {
    const params = useParams();
    const userId = params.id as string;

    // Get user data based on ID, fallback to stranger if not found
    const getUserData = (id: string) => {
        return DUMMY_USERS[id as keyof typeof DUMMY_USERS] || {
            userId: id,
            name: 'Unknown User',
            friendCount: 0,
            bio: 'This user profile could not be found.',
            avatarUrl: 'https://i.pravatar.cc/150?img=50',
            friendType: 'stranger' as FriendType,
            aboutData: {
                personalDetails: {
                    bio: 'This user profile could not be found.',
                    fullName: 'Unknown User',
                    dateOfBirth: "Unknown",
                    residence: "Unknown",
                    homeCountry: "Unknown",
                },
                workExperience: [],
                education: []
            }
        };
    };

    const userData = getUserData(userId);





    return (
        <div className="flex space-x-5 my-2">
            {/* Left Column */}
            <div className="lg:w-[50vw] space-y-2">
                <ProfileHeader
                    userId={userId}
                    friendType={userData.friendType}
                    showFriendActions={true}
                />
                <NavigationTabs
                    userId={userId}
                    isOwnProfile={false}

                />
            </div>

            {/* Right Column */}
            <div className="lg:w-[25vw] space-y-2 mb-4">
                <div className='min-h-0'>
                    <PersonalDetails data={{
                        joinDate: userData.joinDate,
                    }} />                </div>

                <div className='min-h-0'>
                    <TrustScore
                        trustScore={userData.trustScore}
                    />
                </div>
            </div>
        </div>
    );
}