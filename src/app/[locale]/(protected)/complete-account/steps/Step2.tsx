// steps/Step2.tsx - Community
import React from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { useTranslations } from 'next-intl';

interface Step2Props {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
  nextStep: () => void;
  prevStep?: () => void;
}

export const Step2: React.FC<Step2Props> = ({ data, updateData, nextStep, prevStep }) => {
  const t = useTranslations('onboarding');
  
  const isNextDisabled = !data.communityType?.trim();

  const options = [
    { label: t('community.options.localCitizen'), value: 'local' },
    { label: t('community.options.diasporaMember'), value: 'diaspora' },
  ];

  return (
    <MultiStep
      stepNumber={2}
      totalSteps={7}
      title={t('community.title')}
      showSkipButton={false}
      isNextDisabled={isNextDisabled}
      showBackButton={true}
      onNext={() => nextStep()}
      onBack={prevStep}
      onSkip={() => nextStep()}
    >
      <div className="flex flex-wrap gap-4 w-full">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateData({ communityType: option.value })}
            className={`px-6 py-3 rounded-md border text-text-secondary transition-all
              ${data.communityType === option.value
                ? 'bg-surface-brand border-border-brand'
                : 'bg-surface-brand-subtle border-border-brand hover:border-blue-500 hover:text-blue-600'
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </MultiStep>
  );
};