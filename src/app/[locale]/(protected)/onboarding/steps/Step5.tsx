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
    resendCode: () => Promise<void>;
    loading: boolean;
    resendLoading: boolean;
}

export const Step5: React.FC<Step5Props> = ({ 
    data, 
    loading, 
    nextStep, 
    prevStep, 
    updateData, 
    resendCode,
    resendLoading 
}) => {
    const t = useTranslations('onboarding');
    const tActions = useTranslations('actions');

    const [value, setValue] = React.useState("");
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [showResend, setShowResend] = useState(false);

    const COUNTDOWN_KEY = 'otp_resend_expires_at';

    const handleChange = (newValue: string) => {
        const numericValue = newValue.replace(/\D/g, '');
        setValue(numericValue);
        updateData({ verificationCode: numericValue });
    };

    const isNextDisabled = value.length !== 6;

    useEffect(() => {
        // Get resend expiration time from sessionStorage
        const expiresAt = sessionStorage.getItem(COUNTDOWN_KEY);
        
        if (!expiresAt) {
            // First time on this page - show resend button without countdown
            setShowResend(true);
            setIsComplete(true);
            setTimeLeft(null);
            return;
        }

        const updateCountdown = () => {
            const now = Date.now();
            const expirationTime = parseInt(expiresAt);
            const remaining = Math.floor((expirationTime - now) / 1000);

            if (remaining <= 0) {
                setTimeLeft(0);
                setIsComplete(true);
                setShowResend(true);
                sessionStorage.removeItem(COUNTDOWN_KEY);
            } else {
                setTimeLeft(remaining);
                setIsComplete(false);
                setShowResend(true);
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

    const handleResendCode = async () => {
        await resendCode();
        
        // After resend, get the new expiration from backend (stored by submitFormA)
        const expiresAt = sessionStorage.getItem('otp_expires_at');
        if (expiresAt) {
            // Store it as resend expiration
            sessionStorage.setItem(COUNTDOWN_KEY, expiresAt);
            
            const now = Date.now();
            const expirationTime = parseInt(expiresAt);
            const remaining = Math.floor((expirationTime - now) / 1000);
            
            setTimeLeft(remaining);
            setIsComplete(false);
            setShowResend(true);
        }
    };

    return (
        <MultiStep
            isLoading={loading}
            stepNumber={5}
            totalSteps={7}
            title={t('confirmVerification.title')}
            subtitle={t('confirmVerification.description', { phoneNumber: `${data.countryCode} ${data.phoneNumber}` })}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('submit')}
            showBackButton={true}
            showSkipButton={false}
            onNext={() => nextStep()}
            onBack={prevStep}
        >
            <div className="w-full space-y-6">
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

                {showResend && (
                    <div className="flex ">
                        {!isComplete && timeLeft !== null ? (
                            <p className="text-text-secondary text-sm">
                                Resend code in <span className="font-medium text-text-brand">{formatTime(timeLeft)}</span>
                            </p>
                        ) : (
                            <ButtonType3 
                                onClick={handleResendCode}
                                disabled={resendLoading}
                            >
                                {resendLoading ? 'Sending...' : 'Resend code'}
                            </ButtonType3>
                        )}
                    </div>
                )}
            </div>
        </MultiStep>
    );
};