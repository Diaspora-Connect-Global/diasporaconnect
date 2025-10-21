"use client"
import React from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import CommunityCardVariant1 from '@/components/cards/community/CummunityCardVariant1';

interface Step7Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}

export const Step7: React.FC<Step7Props> = ({ data, updateData, prevStep }) => {
    const router = useRouter();
    const t = useTranslations('onboarding');
    const tActions = useTranslations('actions');
    const tC = useTranslations('community');

    const availableCommunities = [
        {
            title: "Ghana Innovation Hub",
            members: 1200,
            description: "Networking opportunities for tech enthusiasts and professionals in Ghana."
        },
        {
            title: "Ghana Business Network",
            members: 850,
            description: "A space for businesses to exchange services and resources effectively."
        },
        {
            title: "Creative Arts Ghana",
            members: 650,
            description: "A community for artists, designers, and creative professionals."
        },
        {
            title: "Tech Entrepreneurs Ghana",
            members: 920,
            description: "Connect with fellow tech entrepreneurs and startups."
        },
        {
            title: "Creative Arts Ghana",
            members: 650,
            description: "A community for artists, designers, and creative professionals."
        },
        {
            title: "Tech Entrepreneurs Ghana I am just testing for long user data",
            members: 920,
            description: "Connect with fellow tech entrepreneurs and startups."
        },
        {
            title: "Creative Arts Ghana",
            members: 650,
            description: "A community for artists, designers, and creative professionals."
        },
        {
            title: "Tech Entrepreneurs Ghana",
            members: 920,
            description: "Connect with fellow tech entrepreneurs and startups."
        }
    ];

    // Ensure community is always an array
    const community = data.community || [];

    const handleSubmit = async (e?: React.FormEvent) => {
        try {
            if (e) {
                e.preventDefault();
            }

            console.log('Going to home screen');
            router.push('/');
        } catch (error) {
            console.error('Submission error:', error);
        }
    };

    const handleCommunityToggle = (communityItem: { title: string; members: number; description: string; }) => {
        const isSelected = community.some(c => c.title === communityItem.title);

        if (isSelected) {
            updateData({
                community: community.filter(c => c.title !== communityItem.title)
            });
        } else {
            updateData({
                community: [...community, communityItem]
            });
        }
    };

    const getButtonText = (communityTitle: string) => {
        return community.some(c => c.title === communityTitle)
            ? tActions('joined')
            : tC('joincommunity');
    };

    // No need to disable next button since users can skip communities
    const isNextDisabled = false;

    return (
        <MultiStep
            stepNumber={7}
            totalSteps={7}
            title={t('community.title')}
            subtitle={t('community.description')}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('finish')}
            showBackButton={true}
            showStepLabel={true}
            showSkipButton={false}
            onNext={handleSubmit}
            onBack={prevStep}
        >
            <div className="w-full">
                <div className="flex gap-[2rem] overflow-x-auto  scrollbar-hide snap-x snap-mandatory">
                    {/* 32px gap, 16px padding */}
                    {availableCommunities.map((communityItem, index) => (
                        <div
                            key={index}
                            className=" sm:w-[17.5rem] snap-start mx-[0.75rem]" 
                        >
                            <CommunityCardVariant1
                                title={communityItem.title}
                                members={communityItem.members}
                                onButtonClick={() => handleCommunityToggle(communityItem)}
                                description={communityItem.description}
                                buttonText={getButtonText(communityItem.title)} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        </MultiStep>
    );
};