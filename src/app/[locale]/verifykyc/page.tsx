'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { useKYCVerification, isVerifiedKycStatus } from '@/hooks/useKYCVerification';
import OnfidoFlow from '@/components/profile/kyc/OnfidoFlow';
import type { KycProvider } from '@/services/gql/types/kyc';
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
  | 'provider'
  | 'onfido'
  | 'pick-country'
  | 'enter-id'
  | 'photos'
  | 'selfie'
  | 'verifying'
  | 'done'
  | 'rejected';

export default function VerifyPage() {
  const [step, setStep] = useState<Step>('start');
  const [provider, setProvider] = useState<KycProvider>('ONFIDO');
  const [onfidoToken, setOnfidoToken] = useState<string | null>(null);

  // Manual-fallback form state (used only when no provider SDK token is issued).
  const [country, setCountry] = useState('');
  const [docType, setDocType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);

  const { initiate, initiating, submitKyc, submitting, pollStatus } =
    useKYCVerification();

  const goBack = (previousStep: Step) => setStep(previousStep);

  /**
   * Begin verification with the chosen provider.
   *  - ONFIDO: initiate -> sdkToken -> mount Onfido SDK.
   *  - ITSME : initiate -> redirectUrl -> redirect the browser (OIDC).
   *  - no token/url (provider disabled): fall back to the manual capture steps.
   */
  const beginVerification = useCallback(
    async (chosen: KycProvider) => {
      setProvider(chosen);
      try {
        const res = await initiate(chosen);

        if (chosen === 'ITSME') {
          if (res?.redirectUrl) {
            window.location.assign(res.redirectUrl);
            return;
          }
          // itsme disabled -> fall back to manual capture.
          toast.message('Redirect unavailable, continuing manually.');
          setStep('pick-country');
          return;
        }

        // ONFIDO (and SUMSUB which also issues an sdkToken).
        if (res?.sdkToken) {
          setOnfidoToken(res.sdkToken);
          setStep('onfido');
          return;
        }

        // No SDK token -> provider disabled on the backend. Graceful fallback.
        toast.message('Verification provider unavailable, continuing manually.');
        setStep('pick-country');
      } catch {
        toast.error('Could not start verification. Please try again.');
        setStep('provider');
      }
    },
    [initiate],
  );

  /** Poll getMyKYCStatus until terminal, then route to done/rejected. */
  const startPolling = useCallback(async () => {
    setStep('verifying');
    const final = await pollStatus();
    if (isVerifiedKycStatus(final.status)) {
      setStep('done');
    } else if (final.status === 'REJECTED' || final.status === 'EXPIRED') {
      setStep('rejected');
    } else {
      // Timed out while still pending/under review — confirm submission to the user.
      setStep('verifying');
    }
  }, [pollStatus]);

  // Manual fallback submission via submitKYC (no provider SDK available).
  const handleManualSubmit = useCallback(async () => {
    try {
      await submitKyc({ providerStrategy: 'manual' });
      toast.success('Verification submitted. We will review it shortly.');
      await startPolling();
    } catch {
      toast.error('Could not submit verification. Please try again.');
    }
  }, [submitKyc, startPolling]);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* === MOBILE ONLY VIEW === */}
      <div className="block md:hidden">
        {step === 'start' && <StartStep onNext={() => setStep('provider')} />}

        {step === 'provider' && (
          <ProviderStep
            provider={provider}
            initiating={initiating}
            onSelect={setProvider}
            onContinue={() => beginVerification(provider)}
            onBack={() => goBack('start')}
          />
        )}

        {step === 'onfido' && onfidoToken && (
          <div className="flex flex-col h-screen p-4">
            <OnfidoFlow
              sdkToken={onfidoToken}
              className="flex-1"
              onComplete={() => {
                void startPolling();
              }}
              onError={() => {
                toast.error('Verification could not be completed. Please try again.');
                setStep('provider');
              }}
              onCancel={() => setStep('provider')}
            />
          </div>
        )}

        {step === 'pick-country' && (
          <CountryStep
            value={country}
            docType={docType}
            onSelect={setCountry}
            onDocTypeChange={setDocType}
            onNext={() => setStep('enter-id')}
            onBack={() => goBack('provider')}
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
              void handleManualSubmit();
            }}
            onBack={() => goBack('photos')}
            docType={docType}
          />
        )}

        {step === 'verifying' && (
          <VerifyingStep onNext={() => setStep('done')} />
        )}

        {step === 'done' && <DoneStep />}

        {step === 'rejected' && (
          <RejectedStep onRetry={() => setStep('provider')} />
        )}
      </div>

      {/* === TABLET / DESKTOP VIEW === */}
      <div className="hidden md:flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          {step === 'onfido' && onfidoToken ? (
            <OnfidoFlow
              sdkToken={onfidoToken}
              onComplete={() => {
                void startPolling();
              }}
              onError={() => {
                toast.error('Verification could not be completed. Please try again.');
                setStep('provider');
              }}
              onCancel={() => setStep('provider')}
            />
          ) : step === 'provider' ? (
            <ProviderStep
              provider={provider}
              initiating={initiating}
              onSelect={setProvider}
              onContinue={() => beginVerification(provider)}
              onBack={() => goBack('start')}
            />
          ) : step === 'verifying' ? (
            <VerifyingStep onNext={() => setStep('done')} />
          ) : step === 'done' ? (
            <DoneStep />
          ) : step === 'rejected' ? (
            <RejectedStep onRetry={() => setStep('provider')} />
          ) : (
            <>
              <h1 className="text-xl font-bold mb-3">Verify your identity</h1>
              <p className="text-gray-500 mb-6">
                Complete identity verification to unlock higher limits and the verified badge.
              </p>
              <ButtonType2
                onClick={() => setStep('provider')}
                disabled={submitting}
                size="lg"
                className="rounded-xl w-full"
              >
                Start verification
              </ButtonType2>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Provider chooser step ───────────────────────────────────────────────────

function ProviderStep({
  provider,
  initiating,
  onSelect,
  onContinue,
  onBack,
}: {
  provider: KycProvider;
  initiating: boolean;
  onSelect: (p: KycProvider) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const options: { id: KycProvider; title: string; subtitle: string }[] = [
    {
      id: 'ONFIDO',
      title: 'Document & selfie',
      subtitle: 'Verify with your passport or national ID and a quick selfie.',
    },
    {
      id: 'ITSME',
      title: 'itsme (Belgium)',
      subtitle: 'Verify instantly with your Belgian digital identity.',
    },
  ];

  return (
    <div className="flex flex-col justify-between h-screen md:h-auto p-6">
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={onBack}
          className="text-text-primary mb-4 hover:text-gray-900 md:hidden"
        >
          ←
        </button>
        <h1 className="text-primary heading-small mb-1">Choose a verification method</h1>
        <p className="text-secondary body-small mb-5">
          Pick how you would like to verify your identity.
        </p>

        <div className="space-y-3">
          {options.map((opt) => {
            const active = provider === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  active
                    ? 'border-border-brand bg-surface-brand-subtle'
                    : 'border-gray-200'
                }`}
              >
                <p className="label-medium text-primary">{opt.title}</p>
                <p className="body-small text-secondary">{opt.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      <ButtonType2
        onClick={onContinue}
        disabled={initiating}
        size="lg"
        className="rounded-xl w-full mt-6"
      >
        {initiating ? 'Starting…' : 'Continue'}
      </ButtonType2>
    </div>
  );
}

// ── Rejected step ───────────────────────────────────────────────────────────

function RejectedStep({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen md:h-auto p-6 text-center">
      <div className="text-red-600 text-6xl mb-6">!</div>
      <h2 className="text-2xl font-bold mb-2">Verification not approved</h2>
      <p className="text-text-secondary mb-6">
        We couldn&apos;t verify your identity this time. You can try again with a clearer
        document and a good-quality selfie.
      </p>
      <ButtonType3 onClick={onRetry} size="lg" className="rounded-xl w-full max-w-xs">
        Try again
      </ButtonType3>
    </div>
  );
}
