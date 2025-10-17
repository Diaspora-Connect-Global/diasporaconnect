'use client';
import React from 'react';
import { FormData } from '../page';
import { TextInput } from '@/components/custom/input';
import { MultiStep } from "@/components/custom/multistep";
import { useTranslations } from 'next-intl';

interface Step1Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep?: () => void;
}

export const Step1: React.FC<Step1Props> = ({ data, updateData, nextStep, prevStep }) => {
    const t = useTranslations('onboarding');
    
    const isNextDisabled = !data.firstName.trim() || !data.lastName.trim();

    return (
        <MultiStep
            stepNumber={1}
            totalSteps={7}
            showSkipButton={false}
            title={t('personalInfo.title')}
            isNextDisabled={isNextDisabled}
            showBackButton={false}
            onNext={() => nextStep()}
            onBack={prevStep}
            onSkip={() => nextStep()}
        >
            <div className="space-y-8 flex justify-between gap-6 w-full">
                <div className="flex-1">
                    <TextInput
                        label={t('personalInfo.firstName.label')}
                        placeholder={t('personalInfo.firstName.placeholder')}
                        value={data.firstName}
                        onChange={(value) => updateData({ firstName: value })}
                        id="firstName"
                    />
                </div>

                <div className="flex-1">
                    <TextInput
                        label={t('personalInfo.lastName.label')}
                        placeholder={t('personalInfo.lastName.placeholder')}
                        value={data.lastName}
                        onChange={(value) => updateData({ lastName: value })}
                        id="lastName"
                    />
                </div>
            </div>
        </MultiStep>
    );
};