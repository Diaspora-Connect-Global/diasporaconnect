'use client';

import { useState } from 'react';
import {
  CountryStep,
  DoneStep,
  IdStep,
  PhotoStep,
  SelfieStep,
  StartStep,
  VerifyingStep,
} from './steps';

type Step =
  | 'start'
  | 'pick-country'
  | 'enter-id'
  | 'photos'
  | 'selfie'
  | 'verifying'
  | 'done';

export default function VerifyPage() {
  const [step, setStep] = useState<Step>('start');
  
  // Form data state
  const [country, setCountry] = useState('');
  const [docType, setDocType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);

  // Handler to submit verification data
  const handleSubmitVerification = async () => {
    const verificationData = {
      country,
      docType,
      idNumber,
      frontImage,
      backImage: docType === 'passport' ? null : backImage,
      selfieImage,
      submittedAt: new Date().toISOString(),
    };

    console.log('Verification Data:', verificationData);
    
    // TODO: Send to your API endpoint
    // try {
    //   const response = await fetch('/api/verify', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(verificationData),
    //   });
    //   const result = await response.json();
    // } catch (error) {
    //   console.error('Verification failed:', error);
    // }
  };

  // Back navigation handlers
  const goBack = (previousStep: Step) => {
    setStep(previousStep);
  };

  return (
    <main className="min-h-screen bg-white text-black">
      {/* === MOBILE ONLY VIEW === */}
      <div className="block md:hidden">
        {step === 'start' && (
          <StartStep onNext={() => setStep('pick-country')} />
        )}

        {step === 'pick-country' && (
          <CountryStep
            value={country}
            docType={docType}
            onSelect={setCountry}
            onDocTypeChange={setDocType}
            onNext={() => setStep('enter-id')}
            onBack={() => goBack('start')}
          />
        )}

        {step === 'enter-id' && (
          <IdStep
            value={idNumber}
            onChange={setIdNumber}
            onNext={() => setStep('photos')}
            onBack={() => goBack('pick-country')}
            docType={docType}
          />
        )}

        {step === 'photos' && (
          <PhotoStep
            frontImage={frontImage}
            backImage={backImage}
            onFrontImageChange={setFrontImage}
            onBackImageChange={setBackImage}
            onNext={() => setStep('selfie')}
            onBack={() => goBack('enter-id')}
            docType={docType}
          />
        )}

        {step === 'selfie' && (
          <SelfieStep
            selfieImage={selfieImage}
            onSelfieImageChange={setSelfieImage}
            onNext={() => {
              handleSubmitVerification();
              setStep('verifying');
            }}
            onBack={() => goBack('photos')}
            docType={docType}
          />
        )}

        {step === 'verifying' && (
          <VerifyingStep onNext={() => setStep('done')} />
        )}

        {step === 'done' && <DoneStep />}
      </div>

      {/* === TABLET / DESKTOP VIEW === */}
      <div className="hidden md:flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-bold mb-3">Mobile Only</h1>
          <p className="text-gray-500">
            Please open this page on your mobile device to continue verification.
          </p>
        </div>
      </div>
    </main>
  );
}