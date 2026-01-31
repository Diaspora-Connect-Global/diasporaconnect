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

    // Add the type to useMutation
    const [resetPasswordMutation, { loading }] = useMutation<ResetPasswordResponse>(RESET_PASSWORD);

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        updateData({ password: value });
    };

    const handleSubmit = async () => {
        try {
            const { data: responseData } = await resetPasswordMutation({
                variables: {
                    email: data.email,
                    resetCode: data.verificationCode,
                    newPassword: password
                }
            });

            const result = responseData?.resetPassword;

            // Check if the result contains an error message
            if (result?.toLowerCase().includes('failed') || 
                result?.toLowerCase().includes('invalid') || 
                result?.toLowerCase().includes('expired') ||
                result?.toLowerCase().includes('error')) {
                toast.error(result);
            } else {
                // Success case
                toast.success(result || t('success') || 'Password reset successfully!');
                setTimeout(() => {
                    router.push('/signin');
                }, 1000);
            }
        } catch (err: any) {
            console.error('Password reset failed:', err);
            toast.error(err?.message || t('error') || 'An error occurred');
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
        >
            <div className="w-full space-y-3">
                <PasswordInput
                    id='password'
                    password={password}
                    setPassword={handlePasswordChange}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    placeholder={t("newPassword.createPassword.placeholder")}
                    label={t("newPassword.createPassword.label")}
                />
                <PasswordInput
                    id='confirmPassword'
                    password={confirmPassword}
                    setPassword={setConfirmPassword}
                    showPassword={showConfirmPassword}
                    setShowPassword={setShowConfirmPassword}
                    placeholder={t("newPassword.confirmPassword.placeholder")}
                    label={t("newPassword.confirmPassword.label")}
                />
            </div>
        </MultiStep>
    );
};