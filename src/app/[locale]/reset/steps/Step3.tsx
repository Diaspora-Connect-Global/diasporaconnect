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

export const Step3: React.FC<Step3Props> = ({ data, updateData, prevStep }) => {
    const t = useTranslations('passwordReset');
    const tActions = useTranslations('actions');
    const router = useRouter();

    const [password, setPassword] = useState(data.password || '');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [resetPasswordMutation, { loading }] = useMutation(RESET_PASSWORD);

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        updateData({ password: value });
    };

    const handleSubmit = async () => {
        try {
            await resetPasswordMutation({
                variables: {
                    email: data.email,
                    resetCode: data.verificationCode,
                    newPassword: password
                }
            });

            
            router.push('/signin');
        } catch (err) {
            console.error('Password reset failed:', err);
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
