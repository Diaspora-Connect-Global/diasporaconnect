// steps/Step5.tsx - OTP Verification
import React from 'react';
import { ResetFormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { useTranslations } from 'next-intl';
import { TextInput } from '@/components/custom/input';
import { useRouter } from 'next/navigation';


interface Step2Props {
    data: ResetFormData;
    updateData: (data: Partial<ResetFormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}

export const Step1: React.FC<Step2Props> = ({ data, updateData, nextStep }) => {
    const t = useTranslations('passwordReset');
    const tActions = useTranslations('actions');
        const router = useRouter();
    

  const handleBack = async () => {
            router.push('/signin');
       
    };

    const isNextDisabled = !data.email.trim();

    return (
        <MultiStep
            stepNumber={1}
            totalSteps={3}
            title={t('request.title')}
            subtitle={t('request.description', { phoneNumber: ` ${data.email}` })}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('submit')}
            showBackButton={true}
            showSkipButton={false}
            onNext={() => nextStep()}
            onBack={handleBack}
            showStepLabel={false}
        >
            <div className="w-full">
                <TextInput
                    label={t('request.email.label')}
                    placeholder={t('request.email.placeholder')}
                    value={data.email}
                    onChange={(value) => updateData({ email: value })}
                    id="firstName"
                />
            </div>
        </MultiStep>
    );
};