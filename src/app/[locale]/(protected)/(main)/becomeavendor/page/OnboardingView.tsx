/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { Step1 } from '../steps/Step1';
import { Step2 } from '../steps/Step2';
import { useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useUserStore } from '@/store/useUserStore';
import { toast } from 'sonner';
import { CREATE_VENDOR } from '@/services/gql/vendor';
import { handleVendorError } from '@/lib/vendor-error-mapper';
import { PageHero } from '@/components/redesign/PageHero';
import { CATEGORY_PHOTOS } from '@/lib/redesignImages';
import { PageShell, ContentWithRail } from '@/components/vendor-onboarding/PageShell';
import { StepIndicator } from '@/components/vendor-onboarding/StepIndicator';
import { BenefitsRail } from '@/components/vendor-onboarding/BenefitsRail';
import { IntroCard } from '@/components/vendor-onboarding/IntroCard';


export default function OnboardingView() {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('vendorOnboarding.hero');
    const currentUser = useUserStore((state) => state.user);
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<any>({
        communityType: '',
    });
    const [createVendor, { loading: isSubmitting }] = useMutation<{ createVendor: string }>(CREATE_VENDOR);



    const updateFormData = (newData: Partial<any>) => {
        setFormData((prev: any) => ({ ...prev, ...newData }));
    };

    const nextStep = () => {
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const submitVendor = async () => {
        try {
            const vendorType = formData.communityType === 'products' ? 'BUSINESS' : 'INDIVIDUAL';
            const displayName = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || 'Vendor';
            const description =
                formData.communityType === 'services'
                    ? 'Service provider on DiasporaConnect'
                    : 'Product seller on DiasporaConnect';

            const { data } = await createVendor({
                variables: {
                    vendorType,
                    displayName,
                    description,
                },
            });

            if (!data?.createVendor) {
                toast.error('Failed to create vendor profile');
                return;
            }

            toast.success('Vendor profile created');
            router.push(`/${locale}/vendors`);
        } catch (error) {
            handleVendorError({
                error,
                locale,
                router,
            });
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (

                        <IntroCard onFinish={() => {
                            nextStep();
                        }} />
                );
            case 2:
                return (

                        <Step1
                            data={formData}
                            updateData={updateFormData}
                            nextStep={nextStep}
                            prevStep={prevStep}
                        />
                );
            case 3:
                return (
                        <Step2
                            data={formData}
                            updateData={updateFormData}
                            nextStep={nextStep}
                            prevStep={prevStep}
                            onSubmit={submitVendor}
                            isSubmitting={isSubmitting}
                        />


                );
            default:
                return null;
        }
    };

    return (
        <PageShell>
            <PageHero id="vendor-onboarding-title" eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} image={CATEGORY_PHOTOS.product} priority />
            <StepIndicator current={currentStep as 1 | 2 | 3} />
            <ContentWithRail rail={<BenefitsRail />}>{renderStep()}</ContentWithRail>
        </PageShell>
    );
}
