'use client';

import React, { useState, useEffect } from 'react';
import { Step1 } from './steps/Step1';
import { Step2 } from './steps/Step2';
import { Step3 } from './steps/Step3';

export interface ResetFormData {
    email: string;
    password: string;
    verificationCode: string;
}

export default function ResetAccount() {
    
    const [mounted, setMounted] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<ResetFormData>({
        email: '',
        password: '',
        verificationCode: '',
    });

    // Handle mounting and load saved data
    useEffect(() => {
        setMounted(true);
        
        const savedData = sessionStorage.getItem('accountResetFormData');
        const savedStep = sessionStorage.getItem('accountResetFormStep');

        if (savedData) {
            setFormData(JSON.parse(savedData));
        }
        if (savedStep) {
            setCurrentStep(parseInt(savedStep));
        }
    }, []);

    // Save to session storage whenever formData or currentStep changes
    useEffect(() => {
        if (mounted) {
            sessionStorage.setItem('accountResetFormData', JSON.stringify(formData));
            sessionStorage.setItem('accountResetFormStep', currentStep.toString());
        }
    }, [formData, currentStep, mounted]);

    const updateFormData = (newData: Partial<ResetFormData>) => {
        setFormData(prev => ({ ...prev, ...newData }));
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
                    <Step1
                        data={formData}
                        updateData={updateFormData}
                        nextStep={nextStep}
                        prevStep={prevStep}
                    />
                );
            case 2:
                return (
                    <Step2
                        data={formData}
                        updateData={updateFormData}
                        nextStep={nextStep}
                        prevStep={prevStep}
                    />
                );
            case 3:
                return (
                    <Step3
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

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) {
        return null;
    }

    return (
        <>
            {renderStep()}
        </>
    );
}