/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Onboarding from '@/components/vendors/OnboardingVendor';
import React, { useState } from 'react';
import { Step1 } from '../steps/Step1';
import { Step2 } from '../steps/Step2';


export default function OnboardingView() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<any>({
        email: '',
        password: '',
        verificationCode: '',
    });



    const updateFormData = (newData: Partial<any>) => {
        setFormData((prev: any) => ({ ...prev, ...newData }));
    };

    const nextStep = () => {
        setCurrentStep(prev => Math.min(prev + 1, 3));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };


    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className='lg:w-[40vw] mx-auto'>

                        <Onboarding onFinish={() => {
                            nextStep();
                        }} />
                    </div>
                );
            case 2:
                return (
                    <div className='lg:w-[40vw] mx-auto py-8'>

                        <Step1
                            data={formData}
                            updateData={updateFormData}
                            nextStep={nextStep}
                            prevStep={prevStep}
                        />
                    </div>
                );
            case 3:
                return (

                    <div className='lg:w-[40vw] lg:h-[80vh] m-auto py-8'>

                        <Step2
                            data={formData}
                            updateData={updateFormData}
                            nextStep={nextStep}
                            prevStep={prevStep}
                        />

                    </div>

                );
            default:
                return null;
        }
    };

    return (
        <>
            {renderStep()}
        </>
    );
}