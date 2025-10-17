"use client"
import React, { useState } from 'react';
import { ResetFormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { useTranslations } from 'next-intl';
import { PasswordInput } from '@/components/custom/input';
import { useRouter } from 'next/navigation';

interface Step3Props {
    data: ResetFormData;
    updateData: (data: Partial<ResetFormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}

export const Step3: React.FC<Step3Props> = ({ data, updateData, prevStep }) => {
    const t = useTranslations('passwordReset');
    const tActions = useTranslations('actions');
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        updateData({ password: value });
    };

    const handleSubmit = async () => {
        try {
            // Your API call here
            console.log('Submitting password reset:', { 
                email: data.email, 
                verificationCode: data.verificationCode,
                password: data.password 
            });
            
            // If successful, redirect
            router.push('/signin');
        } catch (error) {
            console.error('Submission error:', error);
        }
    };

    const isNextDisabled = !password.trim() || !confirmPassword.trim() || password !== confirmPassword;

    return (
        <MultiStep
            stepNumber={3}
            totalSteps={3}
            title={t('newPassword.title')}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('submit')}
            showBackButton={true}
            showSkipButton={false}
            onNext={handleSubmit}
            onBack={prevStep}
            showStepLabel={false}
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