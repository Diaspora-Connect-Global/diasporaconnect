'use client';

import React, { useState, useEffect } from 'react';
import { Step1 } from './steps/Step1';
import { Step2 } from './steps/Step2';
import { Step3 } from './steps/Step3';
import { Step4 } from './steps/Step4';
import { Step5 } from './steps/Step5';
import { Step6 } from './steps/Step6';
import { Step7 } from './steps/Step7';

export interface FormData {
  // Step 1
  firstName: string;
  lastName: string;

  // Step 2
  community: Array<{
    title: string;
    members: number;
    description: string;
  }>;
  // Step 3
  country: string;
  communityType: string

  // Step 4
  phoneNumber: string;

  // Step 5
  verificationCode: string;

  // Step 6
  topics: string[];

  // Step 7
  recommendations: string[];
}

export default function CompleteAccount() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    community: [],
    communityType: "",
    country: '',
    phoneNumber: '',
    verificationCode: '',
    topics: [],
    recommendations: []
  });
  const [sendCodeLoading ,setSendCodeLoading] = useState(false)
  const [verifyOTPLoading ,setVerifyOTPLoading] = useState(false)

  // Load from session storage on component mount
  useEffect(() => {
    const savedData = sessionStorage.getItem('accountFormData');
    const savedStep = sessionStorage.getItem('accountFormStep');

    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
    if (savedStep) {
      setCurrentStep(parseInt(savedStep));
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('accountFormData', JSON.stringify(formData));
    sessionStorage.setItem('accountFormStep', currentStep.toString());
  }, [formData, currentStep]);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 7));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

const submitFormA = async () => {
  try {
    setSendCodeLoading(true);
    console.log("Sending OTP..." ,formData);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // OTP sent → move to next step
    nextStep();
  } catch (error) {
    console.error('Error sending OTP:', error);
    // Optionally show error toast
  } finally {
    setSendCodeLoading(false);
  }
};


  const submitFormB = async () => {
  try {
    console.log("Verifying OTP...",formData);
    setVerifyOTPLoading(true)

    await new Promise(resolve => setTimeout(resolve, 2000));

    nextStep(); 
  } catch (error) {
    console.error('OTP verification failed:', error);
    // Show error in UI
  }finally{
        setVerifyOTPLoading(false)

  }
};

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1
            data={formData}
            updateData={updateFormData}
            nextStep={nextStep}
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
      case 4:
        return (
          <Step4
            data={formData}
            updateData={updateFormData}
            nextStep={submitFormA}
            loading={sendCodeLoading}
            prevStep={prevStep}
          />
        );
      case 5:
        return (
          <Step5
            data={formData}
            updateData={updateFormData}
            nextStep={submitFormB}
            loading={verifyOTPLoading}
            prevStep={prevStep}
          />
        );
      case 6:
        return (
          <Step6
            data={formData}
            updateData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 7:
        return (
          <Step7
            data={formData}
            updateData={updateFormData}
            prevStep={prevStep}
            nextStep={nextStep}

          />
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
};

