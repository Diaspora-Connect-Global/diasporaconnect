// app/page.tsx
'use client';

import { useState } from 'react';
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { NavigationTabs } from '@/components/profile/NavigationTabs';
import { PersonalDetails } from '@/components/profile/PersonalDetails';
import { ProfileCompletion } from '@/components/profile/ProfileCompletion';
import { KYCVerification } from '@/components/profile/KYCVerification';
import { TrustScore } from '@/components/profile/TrustScore';

export default function Profile() {
    // State for all component data
    const [profileData,] = useState({
        name: "John Doe",
        friendCount: 200,
        bio: "I am known to be a software developer who enjoys hiking and coding.",
        avatarUrl: "/avatar-placeholder.jpg",
    });

    const [aboutData] = useState({
        personalDetails: {
            bio: "I am known to be a software developer who enjoys hiking and coding.",
            fullName: "John Doe",
            dateOfBirth: "14 November 1990",
            residence: "Mechelen, Belgium (4 years)",
            homeCountry: "Ghana",
        },
        workExperience: [
            {
                title: "Senior Software Developer",
                company: "Tech Company",
                period: "2020 - Present",
                description: "Developing web applications using React, Node.js, and TypeScript."
            },
            {
                title: "Software Developer",
                company: "Startup Inc.",
                period: "2018 - 2020",
                description: "Full-stack development and team leadership."
            }
        ],
        education: [
            {
                degree: "Master of Computer Science",
                institution: "University of Technology",
                period: "2014 - 2016"
            },
            {
                degree: "Bachelor of Software Engineering",
                institution: "State University",
                period: "2010 - 2014"
            }
        ]
    });

    const [postsData] = useState({
        items: [] // Empty for now
    });

    const [communitiesData] = useState({
        items: [] // Empty for now
    });

    const [profileCompletion, setProfileCompletion] = useState({
        percentage: 40,
        joinDate: "1st November, 2025",
    });

    const [kycStatus, setKycStatus] = useState({
        verified: false,
        joinDate: "1st November, 2025",
    });

    const [trustScore, setTrustScore] = useState({
        score: 10,
        maxScore: 100,
        levels: {
            starter: false,
            trusted: true,
            reliable: false,
            elite: true,
        },
        showDescription: false,
    });

    // Event handlers
    const handleCompleteProfile = () => {
        setProfileCompletion(prev => ({ ...prev, percentage: 100 }));
    };

    const handleVerifyKYC = () => {
        setKycStatus(prev => ({ ...prev, verified: true }));
    };

    const handleLevelChange = (level: keyof typeof trustScore.levels, checked: boolean) => {
        setTrustScore(prev => ({
            ...prev,
            levels: {
                ...prev.levels,
                [level]: checked,
            },
        }));
    };



    return (
        <div className="flex space-x-5 my-2">
            {/* Left Column */}
            <div className="lg:w-[50vw] space-y-2">
                <ProfileHeader data={profileData} />
                <NavigationTabs
                    aboutData={aboutData}
                    postsData={postsData}
                    communitiesData={communitiesData}
                />
            </div>

            {/* Right Column */}
            <div className="lg:w-[25vw] lg:h-[80vh] space-y-2 mb-1">
                <div className=' min-h-0'>
                    <ProfileCompletion
                        data={profileCompletion}
                        onCompleteProfile={handleCompleteProfile}
                    />
                </div>

                <div className=' min-h-0'>
                    <KYCVerification
                        data={kycStatus}
                        onVerify={handleVerifyKYC}
                    />
                </div>

                <div className=' min-h-0'>
                    <PersonalDetails data={{ joinDate: "1st November, 2025" }} />
                </div>

                <div className='min-h-0'>
                    <TrustScore
                        data={trustScore}
                        onLevelChange={handleLevelChange}
                    />
                </div>
            </div>
        </div>
    );
}