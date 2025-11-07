// steps/Step5.tsx - OTP Verification
import React from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslations } from 'next-intl';

interface Step5Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
    loading: boolean;
}

export const Step5: React.FC<Step5Props> = ({ data, loading, nextStep, prevStep,updateData }) => {
    const t = useTranslations('onboarding');
    const tActions = useTranslations('actions');

    const [value, setValue] = React.useState("");

    const handleChange = (newValue: string) => {
        // Only allow numbers
        const numericValue = newValue.replace(/\D/g, '');
        setValue(numericValue);
        updateData({ verificationCode: numericValue })
    };

    const isNextDisabled = value.length !== 6;

    return (
        <MultiStep
            isLoading={loading}
            stepNumber={5}
            totalSteps={7}
            title={t('confirmVerification.title')}
            subtitle={t('confirmVerification.description', { phoneNumber: `+233 ${data.phoneNumber}` })}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('submit')}
            showBackButton={true}
            showSkipButton={false}
            onNext={() => nextStep()}
            onBack={prevStep}
        >
            <div className="w-full">
                <InputOTP
                    maxLength={6}
                    value={value}
                    onChange={handleChange}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    className="w-full"
                >
                    <InputOTPGroup className="w-full gap-2 text-text-primary font-body-large focus:outline-none focus:ring-0 border-0 bg-surface-subtle">
                        <InputOTPSlot index={0} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={1} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={2} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={3} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={4} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={5} className="flex-1 h-12 text-lg rounded-md" />
                    </InputOTPGroup>
                </InputOTP>
            </div>
        </MultiStep>
    );
};