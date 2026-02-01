'use client';

import React from 'react';
import { FormData } from '../page';
import { TextInput } from '@/components/custom/input';
import { MultiStep } from '@/components/custom/multistep';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface Step1Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep?: () => void;
    isOAuth?: boolean;
}

export const Step1: React.FC<Step1Props> = ({
    data,
    updateData,
    nextStep,
    isOAuth = false
}) => {
    const t = useTranslations('onboarding');
    const router = useRouter();

    const handleBack = () => {
        router.push('/signup');
    };

    const isNextDisabled =
        !data.firstName.trim() || !data.lastName.trim();

    return (
        <MultiStep
            stepNumber={1}
            totalSteps={7}
            showSkipButton={false}
            title={t('personalInfo.title')}
            isNextDisabled={isNextDisabled}
            showBackButton={true}
            onNext={nextStep}
            onBack={handleBack}
        >
            <div className="space-y-6 md:space-y-8 flex flex-col md:flex-row gap-4 md:gap-6 w-full">
                <div className="flex-1 w-full">
                    <TextInput
                        label={t('personalInfo.firstName.label')}
                        placeholder={t('personalInfo.firstName.placeholder')}
                        value={data.firstName}
                        onChange={(value) =>
                            !isOAuth &&
                            updateData({ firstName: value })
                        }
                        id="firstName"
                        disabled={isOAuth}
                    />
                </div>

                <div className="flex-1 w-full">
                    <TextInput
                        label={t('personalInfo.lastName.label')}
                        placeholder={t('personalInfo.lastName.placeholder')}
                        value={data.lastName}
                        onChange={(value) =>
                            !isOAuth &&
                            updateData({ lastName: value })
                        }
                        id="lastName"
                        disabled={isOAuth}
                    />
                </div>
            </div>
        </MultiStep>
    );
};
