// steps/Step2.tsx - Local citizen or diaspora member (sent as `role`)
import React from 'react';
import { Check, Globe, House } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { ICON_CHIP_CLASS } from '@/components/more/MoreLinkCard';

interface Step2Props {
  data: FormData;
  updateData: (data: Partial<FormData>) => void;
  nextStep: () => void;
  prevStep?: () => void;
}

// Each option explains itself: the choice is stored and nothing else reads it,
// so the copy must not promise personalisation or a way to change it later.
const OPTIONS = [
  { value: 'local', key: 'localCitizen', icon: House },
  { value: 'diaspora', key: 'diasporaMember', icon: Globe },
] as const;

export const Step2: React.FC<Step2Props> = ({ data, updateData, nextStep, prevStep }) => {
  const t = useTranslations('onboarding');

  const isNextDisabled = !data.communityType?.trim();

  return (
    <MultiStep
      stepNumber={2}
      totalSteps={5}
      title={t('community.title')}
      subtitle={t('community.description')}

      showSkipButton={false}
      isNextDisabled={isNextDisabled}
      showBackButton={true}
      onNext={() => nextStep()}
      onBack={prevStep}
      onSkip={() => nextStep()}
    >
      <fieldset className="w-full min-w-0">
        <legend className="sr-only">{t('community.title')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map(({ value, key, icon: Icon }) => {
            const selected = data.communityType === value;
            return (
              <label key={value} className="relative block cursor-pointer">
                <input
                  type="radio"
                  name="onboarding-community-type"
                  value={value}
                  checked={selected}
                  onChange={() => updateData({ communityType: value })}
                  className="peer sr-only"
                />
                <span
                  className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 transition-[border-color,box-shadow,background-color] peer-focus-visible:ring-2 peer-focus-visible:ring-text-brand peer-focus-visible:ring-offset-2 ${selected ? 'border-border-brand bg-surface-brand-subtle shadow-sm' : 'border-border-subtle bg-surface-default hover:border-border-brand'}`}
                >
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full ${ICON_CHIP_CLASS}`}>
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text-primary">{t(`community.options.${key}`)}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t(`community.descriptions.${key}`)}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`grid size-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-border-brand bg-surface-brand text-white' : 'border-border-subtle bg-surface-default'}`}
                  >
                    {selected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('community.notSure')}</p>
      </fieldset>
    </MultiStep>
  );
};
