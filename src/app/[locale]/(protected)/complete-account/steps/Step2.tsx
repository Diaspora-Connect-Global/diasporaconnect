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
      subtitle={t('community.description')}

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
            className={`px-6 py-3 rounded-md border  transition-all cursor-pointer w-full lg:w-auto
              ${data.communityType === option.value
                ? ' border-border-brand text-text-primary'
                : 'bg-surface-brand-subtle  text-text-primary '
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </MultiStep>
  );
};