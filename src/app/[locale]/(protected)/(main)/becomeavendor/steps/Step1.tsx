/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { MultiStep } from '@/components/custom/multistep';
import { useTranslations } from 'next-intl';

interface Step1Props {
    data: any;
    updateData: (data: Partial<any>) => void;
    nextStep: () => void;
    prevStep?: () => void;
}

export const Step1: React.FC<Step1Props> = ({ data, updateData, nextStep, prevStep }) => {
    const t = useTranslations('onboarding');

    const isNextDisabled = !data.communityType?.trim();

    const options = [
        { label: "Sell products", value: 'products' },
        { label: "Provide services", value: 'services' },
    ];

    return (
        <MultiStep
            stepNumber={2}
            totalSteps={7}
            title={"Become a vendor"}
            subtitle={"Join thousands of businesses selling to customers worldwide"}
            showSkipButton={false}
            isNextDisabled={isNextDisabled}
            showBackButton={true}
            onNext={() => nextStep()}
            onBack={prevStep}
            onSkip={() => nextStep()}
            showStepLabel={false}

        >
            <div className="grid grid-cols-2 gap-4 w-full">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => updateData({ communityType: option.value })}
                        className={`px-6 py-3 label-large   h-20 rounded-md border flex items-center  transition-all cursor-pointer
              ${data.communityType === option.value
                                ? ' border-border-brand text-text-primary'
                                : 'bg-surface-brand-subtle  text-text-primary '
                            }`}
                    >
                        <div className="w-10 h-10 mr-4 bg-surface-disabled border border-surface-brand-light rounded-xl" />
                        {option.label}
                    </button>
                ))}
            </div>
        </MultiStep>
    );
};