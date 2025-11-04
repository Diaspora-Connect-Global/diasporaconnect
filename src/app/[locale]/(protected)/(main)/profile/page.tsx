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
        // In a real app, you might open a modal or navigate to profile completion page
    };

    const handleVerifyKYC = () => {
        setKycStatus(prev => ({ ...prev, verified: true }));
        // In a real app, you might open a verification modal
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

    const handleDescriptionToggle = (checked: boolean) => {
        setTrustScore(prev => ({
            ...prev,
            showDescription: checked,
        }));
    };

    return (
        <div className=" pt-8">
                <div className="flex space-x-3">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6 lg:w-[56rem]">
                        <ProfileHeader data={profileData} />
                        <NavigationTabs
                            aboutData={aboutData}
                            postsData={postsData}
                            communitiesData={communitiesData}
                        />

                    </div>

                    {/* Right Column */}
                    <div className="space-y-3 lg:w-[17.5rem]">
                        <ProfileCompletion
                            data={profileCompletion}
                            onCompleteProfile={handleCompleteProfile}
                        />
                        <KYCVerification
                            data={kycStatus}
                            onVerify={handleVerifyKYC}
                        />
                        <PersonalDetails />
                        <TrustScore
                            data={trustScore}
                            onLevelChange={handleLevelChange}
                            onDescriptionToggle={handleDescriptionToggle}
                        />
                    </div>
                </div>
        </div>
    );
}