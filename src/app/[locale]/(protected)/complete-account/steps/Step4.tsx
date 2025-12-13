// steps/Step4.tsx - Phone Number
import React from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { LabelMedium, TextPrimary } from '@/components/utils';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface Step4Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
    loading: boolean;
}

export const Step4: React.FC<Step4Props> = ({ data, loading, updateData, nextStep, prevStep }) => {
    const t = useTranslations('onboarding');
    const tActions = useTranslations('actions');
    
    const isNextDisabled = !data.phoneNumber.trim();

    return (
        <MultiStep
        isLoading={loading}
            stepNumber={4}
            totalSteps={7}
            title={t('phoneVerification.title')}
            subtitle={t('phoneVerification.description')}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('sendCode')}
            showBackButton={true}
            showSkipButton={false}
            onNext={() => nextStep()}
            onBack={prevStep}
        >
            <div className="w-full">
                <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium mb-2"
                >
                    <LabelMedium>
                        {t('phoneVerification.phoneNumber.label')}
                    </LabelMedium>
                </label>

                <InputGroup className='px-3 py-6 border-1 border-border-default rounded-sm bg-surface-subtle text-text-primary focus:outline-none focus:ring-0 transition'>
                    <InputGroupAddon>
                        <InputGroupText>
                         <Image src={`https://flagcdn.com/w20/${data.country.toLowerCase()}.png`} alt="Logo" width={25} height={15} className="" />
                        </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupAddon>
                        <InputGroupText className='text-text-primary'>
                            <TextPrimary>
                                {data.countryCode}
                            </TextPrimary>
                        </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput 
                        onChange={(e) => updateData({ phoneNumber: e.target.value })}
                        value={data.phoneNumber || ''}
                        placeholder={t('phoneVerification.phoneNumber.placeholder')}
                        className='text-text-primary font-body-large  px-3 py-6 ml-5 focus:outline-none focus:ring-0 border-0' 
                    />
                </InputGroup>
            </div>
        </MultiStep>
    );
};