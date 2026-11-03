/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Briefcase, Check, ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StepFrame } from '@/components/vendor-onboarding/StepFrame';
import { ICON_CHIP_CLASS } from '@/components/more/MoreLinkCard';

interface Step1Props {
    data: any;
    updateData: (data: Partial<any>) => void;
    nextStep: () => void;
    prevStep?: () => void;
}

const OPTIONS = [
    { value: 'products', key: 'products', icon: ShoppingBag },
    { value: 'services', key: 'services', icon: Briefcase },
] as const;

export const Step1: React.FC<Step1Props> = ({ data, updateData, nextStep, prevStep }) => {
    const t = useTranslations('vendorOnboarding.choose');

    const isNextDisabled = !data.communityType?.trim();

    return (
        <StepFrame
            id="vendor-choose-title"
            number={2}
            title={t('title')}
            subtitle={t('subtitle')}
            isNextDisabled={isNextDisabled}
            onNext={() => nextStep()}
            onBack={() => prevStep?.()}
        >
            <fieldset className="min-w-0">
                <legend className="sr-only">{t('legend')}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                    {OPTIONS.map(({ value, key, icon: Icon }) => {
                        const selected = data.communityType === value;
                        return (
                            <label key={value} className="relative block cursor-pointer">
                                <input
                                    type="radio"
                                    name="vendor-offer"
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
                                        <span className="block text-sm font-semibold text-text-primary">{t(`${key}.title`)}</span>
                                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t(`${key}.description`)}</span>
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
            </fieldset>
        </StepFrame>
    );
};
