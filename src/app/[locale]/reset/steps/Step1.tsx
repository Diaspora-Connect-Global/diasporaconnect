import React, { useState } from 'react';
import { ResetFormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { TextInput } from '@/components/custom/input';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { FORGOT_PASSWORD } from '@/services/gql/authentication';
import { toast } from 'sonner';
import { isValidEmailFormat } from '@/lib/emailValidation';
import { classifyAuthError, isNetworkError } from '@/lib/authErrorMessages';


interface Step1Props {
    data: ResetFormData;
    updateData: (data: Partial<ResetFormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}

export const Step1: React.FC<Step1Props> = ({ data, updateData, nextStep }) => {
    const t = useTranslations('passwordReset');
    const tActions = useTranslations('actions');
    const tAuth = useTranslations('authentication');
    const router = useRouter();

    const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD);
    const [error, setError] = useState('');
    const [fieldError, setFieldError] = useState('');

    const handleBack = () => router.push('/signin');

    const handleNext = async () => {
        setError('');
        const email = data.email.trim();
        if (!isValidEmailFormat(email)) {
            setFieldError(tAuth('validation.email.invalid'));
            return;
        }
        setFieldError('');
        try {
            await forgotPassword({
                variables: { email },
            });
            toast.success('Reset code sent to your email');
            nextStep();
        } catch (err) {
            console.error('Failed to send reset code:', err);
            if (isNetworkError(err)) {
                toast.error(t('errors.resetFailed'));
            } else if (classifyAuthError((err as Error)?.message) === 'userNotFound') {
                setError(t('errors.emailNotFound'));
            } else {
                setError(t('errors.emailNotFound'));
            }
        }
    };

    const isNextDisabled = !data.email.trim() || loading;

    return (
        <MultiStep
            stepNumber={1}
            totalSteps={3}
            title={t('request.title')}
            subtitle={t('request.description')}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('submit')}
            showBackButton
            showSkipButton={false}
            onNext={handleNext}
            onBack={handleBack}
            showStepLabel={false}
            isLoading={loading}
            errorMessage={error}
        >
            <div className="w-full">
                <TextInput
                    label={t('request.email.label')}
                    placeholder={t('request.email.placeholder')}
                    value={data.email}
                    onChange={(value) => { updateData({ email: value }); setError(''); setFieldError(''); }}
                    id="email"
                    type="email"
                    errorMessage={fieldError || undefined}
                />
            </div>
        </MultiStep>
    );
};
