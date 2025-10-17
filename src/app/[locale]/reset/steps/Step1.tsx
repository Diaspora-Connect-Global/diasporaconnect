// steps/Step5.tsx - OTP Verification
import React from 'react';
import { ResetFormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslations } from 'next-intl';
import { TextInput } from '@/components/custom/input';

interface Step2Props {
    data: ResetFormData;
    updateData: (data: Partial<ResetFormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}

export const Step1: React.FC<Step2Props> = ({ data, updateData, nextStep, prevStep }) => {
    const t = useTranslations('passwordReset');
    const tActions = useTranslations('actions');



    const isNextDisabled = !data.email.trim();

    return (
        <MultiStep
            stepNumber={1}
            totalSteps={3}
            title={t('request.title')}
            subtitle={t('request.description', { phoneNumber: ` ${data.email}` })}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('submit')}
            showBackButton={true}
            showSkipButton={false}
            onNext={() => nextStep()}
            onBack={prevStep}
            showStepLabel={false}
        >
            <div className="w-full">
                <TextInput
                    label={t('request.email.label')}
                    placeholder={t('request.email.placeholder')}
                    value={data.email}
                    onChange={(value) => updateData({ email: value })}
                    id="firstName"
                />
            </div>
        </MultiStep>
    );
};