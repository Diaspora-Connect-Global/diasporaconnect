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
    errorMessage?: string;
}

export const Step5: React.FC<Step5Props> = ({
    data,
    loading,
    nextStep,
    prevStep,
    updateData,
    resendCode,
    resendLoading,
    errorMessage
}) => {
    const t = useTranslations('onboarding');
    const tActions = useTranslations('actions');

    const formattedPhone = `${data.countryCode}${data.phoneNumber.replace(/^0/, '')}`;
    // Note: the OTP is also delivered by email in the background (so the code
    // still reaches users when the SMS gateway is slow), but the UI intentionally
    // only references the phone number.
    const otpDestination = formattedPhone;

    const [value, setValue] = React.useState("");
    const [codeExpirySeconds, setCodeExpirySeconds] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [showResend, setShowResend] = useState(false);

    const COUNTDOWN_KEY = 'otp_resend_expires_at';
    const OTP_EXPIRES_AT_KEY = 'otp_expires_at';

    const handleChange = (newValue: string) => {
        const numericValue = newValue.replace(/\D/g, '');
        setValue(numericValue);
        updateData({ verificationCode: numericValue });
    };

    const isNextDisabled = value.length !== 6;

    // "Code expires in X:XX" countdown from otp_expires_at (set when OTP is sent)
    useEffect(() => {
        const expiresAt = sessionStorage.getItem(OTP_EXPIRES_AT_KEY);
        if (!expiresAt) {
            setCodeExpirySeconds(null);
            setShowResend(true);
            return;
        }
        const updateExpiryCountdown = () => {
            const now = Date.now();
            const expirationTime = parseInt(expiresAt, 10);
            const remaining = Math.floor((expirationTime - now) / 1000);
            if (remaining <= 0) {
                setCodeExpirySeconds(0);
                setShowResend(true);
            } else {
                setCodeExpirySeconds(remaining);
                setShowResend(true);
            }
        };
        updateExpiryCountdown();
        const timer = setInterval(updateExpiryCountdown, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Get resend expiration time from sessionStorage (set after resend)
        const expiresAt =
            sessionStorage.getItem(COUNTDOWN_KEY) ||
            sessionStorage.getItem(OTP_EXPIRES_AT_KEY);
        
        if (!expiresAt) {
            // No expiration metadata available: allow resend
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
        if (!isComplete) return;

        await resendCode();
        const expiresAt = sessionStorage.getItem(OTP_EXPIRES_AT_KEY);
        if (expiresAt) {
            sessionStorage.setItem(COUNTDOWN_KEY, expiresAt);
            const now = Date.now();
            const expirationTime = parseInt(expiresAt, 10);
            const remaining = Math.floor((expirationTime - now) / 1000);
            setCodeExpirySeconds(remaining > 0 ? remaining : 0);
            setTimeLeft(remaining > 0 ? remaining : 0);
            setIsComplete(remaining <= 0);
            setShowResend(true);
        }
    };

    return (
        <MultiStep
            isLoading={loading}
            stepNumber={5}
            totalSteps={7}
            title={t('confirmVerification.title')}
            subtitle={t('confirmVerification.description', { phoneNumber: otpDestination })}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('submit')}
            showBackButton={true}
            showSkipButton={false}
            onNext={() => nextStep()}
            onBack={prevStep}
            errorMessage={errorMessage}
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
                    <InputOTPGroup className="w-full gap-2 text-text-primary body-large focus:outline-none focus:ring-0 border-0 bg-surface-subtle">
                        <InputOTPSlot index={0} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={1} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={2} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={3} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={4} className="flex-1 h-12 text-lg rounded-md" />
                        <InputOTPSlot index={5} className="flex-1 h-12 text-lg rounded-md" />
                    </InputOTPGroup>
                </InputOTP>

                {codeExpirySeconds !== null && (
                    <p className="text-text-secondary text-sm">
                        {codeExpirySeconds > 0
                            ? t('confirmVerification.codeExpiresIn', { time: formatTime(codeExpirySeconds) })
                            : t('confirmVerification.codeExpired')}
                    </p>
                )}

                {showResend && (
                    <div className="flex ">
                        <ButtonType3
                            onClick={handleResendCode}
                            disabled={resendLoading || !isComplete}
                        >
                            {resendLoading
                                ? 'Sending...'
                                : !isComplete && timeLeft !== null
                                    ? `Resend code in ${formatTime(timeLeft)}`
                                    : 'Resend code'}
                        </ButtonType3>
                    </div>
                )}
            </div>
        </MultiStep>
    );
};