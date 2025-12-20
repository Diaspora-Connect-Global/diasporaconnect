import React from 'react';
import { ResetFormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { TextInput } from '@/components/custom/input';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { FORGOT_PASSWORD } from '@/services/gql/authentication';
import { toast } from 'sonner';


interface Step1Props {
    data: ResetFormData;
    updateData: (data: Partial<ResetFormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}

export const Step1: React.FC<Step1Props> = ({ data, updateData, nextStep }) => {
    const t = useTranslations('passwordReset');
    const tActions = useTranslations('actions');
    const router = useRouter();

    const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD);

    const handleBack = () => router.push('/signin');

    const handleNext = async () => {
        try {
            await forgotPassword({
                variables: { email: data.email },
            });
            toast.success('Reset code sent to your email');
            nextStep();
        } catch (err) {
            console.error('Failed to send reset code:', err);
            toast.error('Email not found or error occurred');
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
        >
            <div className="w-full">
                <TextInput
                    label={t('request.email.label')}
                    placeholder={t('request.email.placeholder')}
                    value={data.email}
                    onChange={(value) => updateData({ email: value })}
                    id="email"
                />
            </div>
        </MultiStep>
    );
};
