'use client'
import React from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { LabelMedium } from '@/components/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from 'next-intl';

interface Step3Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}

export const Step3: React.FC<Step3Props> = ({ data, updateData, nextStep, prevStep }) => {
    const t = useTranslations('onboarding');
    
    const countries = [
        'United States',
        'Canada',
        'United Kingdom',
        'Australia',
        'Germany',
        'France',
        'Japan',
        'India',
        'Brazil',
        'Other'
    ];

    const isNextDisabled = !data.country?.trim();

    const handleCountryChange = (value: string) => {
        updateData({ country: value });
    };

    return (
        <MultiStep
            stepNumber={3}
            totalSteps={7}
            title={t('location.title')}
            isNextDisabled={isNextDisabled}
            showBackButton={true}
            showSkipButton={false}
            onNext={() => nextStep()}
            onBack={prevStep}
            onSkip={() => nextStep()}
        >
            <div className="w-full">
                <label
                    htmlFor="country"
                    className="block text-sm font-medium mb-2"
                >
                    <LabelMedium>
                        {t('location.country.label')}
                    </LabelMedium>
                </label>
                <Select
                    value={data.country || ''}
                    onValueChange={handleCountryChange}
                >
                    <SelectTrigger className="w-full px-3 py-6 border-1 border-border-default rounded-sm bg-surface-subtle text-text-primary focus:outline-none focus:ring-0 transition">
                        <SelectValue placeholder={t('location.country.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                                {country}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </MultiStep>
    );
};