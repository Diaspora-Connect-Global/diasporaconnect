// steps/Step2.tsx - Community
import React from 'react';
import { FormData } from '../page';
import { Step } from './Step';

interface Step2Props {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
  nextStep: () => void;
  prevStep?: () => void;
}

export const Step2: React.FC<Step2Props> = ({ data, updateData, nextStep, prevStep }) => {
  const isNextDisabled = !data.community?.trim();

  const options = [
    { label: 'Local citizen', value: 'local' },
    { label: 'Diaspora', value: 'diaspora' },
  ];

  return (
    <Step
      data={data}
      updateData={updateData}
      nextStep={nextStep}
      prevStep={prevStep}
      stepNumber={2}
      totalSteps={7}
      title="Tell us your community"
      isNextDisabled={isNextDisabled}
    >
      <div className="flex flex-wrap gap-4 w-full">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateData({ community: option.value })}
            className={`px-6 py-3 rounded-md border text-text-secondary  transition-all
              ${
                data.community === option.value
                  ? 'bg-surface-brand border-border-brand'
                  : 'bg-surface-brand-subtle border-border-brand hover:border-blue-500 hover:text-blue-600'
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Step>
  );
};
