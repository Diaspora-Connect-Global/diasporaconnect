'use client'
import React from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { useTranslations } from 'next-intl';
import { CountrySelect } from '@/components/custom/input';

interface Step3Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
    /** True while the account is being created and the code sent. */
    loading?: boolean;
    errorMessage?: string;
}

export const Step3: React.FC<Step3Props> = ({ data, updateData, nextStep, prevStep, loading = false, errorMessage }) => {
    const t = useTranslations('onboarding');

    const isNextDisabled = !data.country?.trim();
    const handleCountryChange = (value: string) => {
        updateData({ country: value });
    };

    return (
        <MultiStep
            stepNumber={3}
            totalSteps={5}
            title={t('location.title')}
            subtitle={t('location.description')}
            isNextDisabled={isNextDisabled}
            showBackButton={true}
            showSkipButton={false}
            isLoading={loading}
            errorMessage={errorMessage}
            onNext={() => nextStep()}
            onBack={prevStep}
        >
            <div className="w-full">
                <CountrySelect
                    value={data.country}
                    onChange={handleCountryChange}
                    label={t('location.country.label')}
                />
            </div>
        </MultiStep>
    );
};