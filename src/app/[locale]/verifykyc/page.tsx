'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

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
  const params = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<Step>('start');
  const [country, setCountry] = useState('');
  const [docType, setDocType] = useState('');
  const [idNumber, setIdNumber] = useState('');

  // Read query params on load
  useEffect(() => {
    const stepParam = params.get('step') as Step;
    const countryParam = params.get('country');
    const docParam = params.get('docType');
    const idParam = params.get('id');

    if (stepParam) setStep(stepParam);
    if (countryParam) setCountry(countryParam);
    if (docParam) setDocType(docParam);
    if (idParam) setIdNumber(idParam);
  }, [params]);

  // Sync query params when state changes
  useEffect(() => {
    const query = new URLSearchParams();

    query.set('step', step);
    if (country) query.set('country', country);
    if (docType) query.set('docType', docType);
    if (idNumber) query.set('id', idNumber);

    router.replace(`?${query.toString()}`);
  }, [step, country, docType, idNumber, router]);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* === MOBILE ONLY VIEW === */}
      <div className="block md:hidden p-4">
        {step === 'start' && <StartStep onNext={() => setStep('pick-country')} />}

        {step === 'pick-country' && (
          <CountryStep
            value={country}
            onSelect={(val) => {
              setCountry(val);
              setStep('enter-id');
            }}
          />
        )}


        {step === 'enter-id' && (
          <IdStep
            value={idNumber}
            onChange={setIdNumber}
            onNext={() => setStep('photos')}
          />
        )}

        {step === 'photos' && (
          <PhotoStep onNext={() => setStep('selfie')} />
        )}

        {step === 'selfie' && (
          <SelfieStep onNext={() => setStep('verifying')} />
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
