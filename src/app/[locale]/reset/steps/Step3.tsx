/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { ResetFormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { useTranslations } from 'next-intl';
import { PasswordInput } from '@/components/custom/input';
import { useRouter } from 'next/navigation';
import { RESET_PASSWORD } from '@/services/gql/authentication';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { isNetworkError } from '@/lib/authErrorMessages';

interface Step3Props {
    data: ResetFormData;
    updateData: (data: Partial<ResetFormData>) => void;
    prevStep: () => void;
}

// Add this type definition
interface ResetPasswordResponse {
    resetPassword: string;
}

export const Step3: React.FC<Step3Props> = ({ data, updateData, prevStep }) => {
    const t = useTranslations('passwordReset');
    const tActions = useTranslations('actions');
    const router = useRouter();

    const [password, setPassword] = useState(data.password || '');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [confirmError, setConfirmError] = useState('');

    // Add the type to useMutation
    const [resetPasswordMutation, { loading }] = useMutation<ResetPasswordResponse>(RESET_PASSWORD);

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        updateData({ password: value });
    };

    const handleSubmit = async () => {
        setError('');
        if (password !== confirmPassword) {
            setConfirmError(t('errors.passwordMismatch'));
            return;
        }
        if (password.length < 12) {
            setError(t('errors.passwordTooShort'));
            return;
        }
        try {
            const { data: responseData } = await resetPasswordMutation({
                variables: {
                    email: data.email,
                    resetCode: data.verificationCode,
                    newPassword: password
                }
            });

            const result = responseData?.resetPassword;
            const resultText = (result || '').toLowerCase();

            // Backend returns the outcome as a string; detect error markers.
            if (resultText.includes('failed') ||
                resultText.includes('invalid') ||
                resultText.includes('expired') ||
                resultText.includes('error')) {
                // Invalid/expired reset code is the common case → banner.
                setError(t('errors.invalidOrExpiredCode'));
            } else {
                // Success case
                toast.success(result || t('success.passwordReset') || 'Password reset successfully!');
                setTimeout(() => {
                    router.push('/signin');
                }, 1000);
            }
        } catch (err: any) {
            console.error('Password reset failed:', err);
            if (isNetworkError(err)) {
                toast.error(t('errors.resetFailed'));
                return;
            }
            const msg = err?.message || '';
            if (/data breach/i.test(msg)) {
                setError(t('errors.breached'));
            } else if (/at least \d+ characters/i.test(msg)) {
                setError(t('errors.passwordTooShort'));
            } else {
                setError(t('errors.invalidOrExpiredCode'));
            }
        }
    };

    const isNextDisabled = !password.trim() || !confirmPassword.trim() || password !== confirmPassword;

    return (
        <MultiStep
            stepNumber={3}
            totalSteps={3}
            title={t('newPassword.title')}
            isNextDisabled={isNextDisabled || loading}
            nextButtonText={tActions('submit')}
            showBackButton
            showSkipButton={false}
            onNext={handleSubmit}
            onBack={prevStep}
            showStepLabel={false}
            isLoading={loading}
            errorMessage={error}
        >
            <div className="w-full space-y-3">
                <PasswordInput
                    id='password'
                    password={password}
                    setPassword={(v) => { handlePasswordChange(v); setError(''); }}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    placeholder={t("newPassword.createPassword.placeholder")}
                    label={t("newPassword.createPassword.label")}
                />
                <PasswordInput
                    id='confirmPassword'
                    password={confirmPassword}
                    setPassword={(v) => { setConfirmPassword(v); setConfirmError(''); setError(''); }}
                    showPassword={showConfirmPassword}
                    setShowPassword={setShowConfirmPassword}
                    placeholder={t("newPassword.confirmPassword.placeholder")}
                    label={t("newPassword.confirmPassword.label")}
                    errorMessage={confirmError}
                />
            </div>
        </MultiStep>
    );
};