// steps/Step2.tsx - Community
import React from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
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
          {data.communityType === option.value ? (
            <ButtonType2
              key={option.value}
              type="button"
              onClick={() => updateData({ communityType: option.value })}
              className="rounded-md w-full lg:w-auto"
            >
              {option.label}
            </ButtonType2>
          ) : (
            <ButtonType3
              key={option.value}
              type="button"
              onClick={() => updateData({ communityType: option.value })}
              className="rounded-md border border-border-subtle bg-surface-subtle text-text-primary w-full lg:w-auto"
            >
              {option.label}
            </ButtonType3>
          )}
        ))}
      </div>
    </MultiStep>
  );
};