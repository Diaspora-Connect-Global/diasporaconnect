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

                        <Onboarding onFinish={() => {
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
                        />


                );
            default:
                return null;
        }
    };

    return (
        <div className='lg:w-[40vw] h-[calc(100vh-4rem)] m-auto  overflow-auto scrollbar-hide'>
            <div className='py-2 lg:py-4 '>
            {renderStep()}
            </div>
        </div>
    );
}