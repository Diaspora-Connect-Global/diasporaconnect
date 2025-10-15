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
  community: string;
  
  // Step 3
  country: string;
  
  // Step 4
  phoneNumber: string;
  
  // Step 5
  verificationCode: string;
  
  // Step 6
  topics: string[];
  
  // Step 7
  recommendations: string[];
}

export default  function CompleteAccount() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    community: '',
    country: '',
    phoneNumber: '',
    verificationCode: '',
    topics: [],
    recommendations: []
  });

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

  // Save to session storage whenever formData or currentStep changes
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

  const submitForm = async () => {
    try {
      // Send data to your NestJS backend
      const response = await fetch('/api/account/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Clear session storage on successful submission
        sessionStorage.removeItem('accountFormData');
        sessionStorage.removeItem('accountFormStep');
        // Handle success (redirect, show success message, etc.)
        console.log('Account created successfully!');
      } else {
        throw new Error('Failed to create account');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
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
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 5:
        return (
          <Step5
            data={formData}
            updateData={updateFormData}
            nextStep={nextStep}
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
            submitForm={submitForm}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen ">
      <div className="w-[70%] mx-auto">
        {/* Progress Bar
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4, 5, 6, 7].map(step => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>
        </div> */}

        {/* Current Step Component */}
        {renderStep()}
      </div>
    </div>
  );
};

