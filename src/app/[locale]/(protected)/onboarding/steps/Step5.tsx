// steps/Step5.tsx - OTP Verification
import React, { useEffect, useState } from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslations } from 'next-intl';
import { ButtonType3 } from '@/components/custom/button';

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

  




const COUNTDOWN_KEY = 'countdown_start_time';
const COUNTDOWN_DURATION = 60; // 60 seconds
const [timeLeft, setTimeLeft] = useState<number | null>(null);
const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // Get or set the start time
        let startTime = localStorage.getItem(COUNTDOWN_KEY);
        
        if (!startTime) {
            startTime = Date.now().toString();
            localStorage.setItem(COUNTDOWN_KEY, startTime);
        }

        const updateCountdown = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - parseInt(startTime!)) / 1000);
            const remaining = COUNTDOWN_DURATION - elapsed;

            if (remaining <= 0) {
                setTimeLeft(0);
                setIsComplete(true);
                localStorage.removeItem(COUNTDOWN_KEY);
            } else {
                setTimeLeft(remaining);
            }
        };

        // Update immediately
        updateCountdown();

        // Then update every second
        const timer = setInterval(updateCountdown, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const resetCountdown = () => {
        localStorage.removeItem(COUNTDOWN_KEY);
        setIsComplete(false);
        setTimeLeft(COUNTDOWN_DURATION);
        localStorage.setItem(COUNTDOWN_KEY, Date.now().toString());
    };

    if (timeLeft === null) {
        return <div>Loading...</div>;
    }












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

                <div>
            {!isComplete ? (
                <p>Resend code in {formatTime(timeLeft)}</p>
            ) : (
                <div>
                    <ButtonType3 onClick={resetCountdown}>Resend code</ButtonType3>
                </div>
            )}
        </div>
            </div>
        </MultiStep>
    );
};