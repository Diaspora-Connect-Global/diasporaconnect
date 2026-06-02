'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';

/**
 * Mounts the Onfido Web SDK into an in-component container.
 *
 * The SDK is dynamically imported so it never runs during SSR / Next build —
 * `onfido-sdk-ui` touches `window`/`document` at module-eval time.
 *
 * Usage: render this only AFTER you have an `sdkToken` from
 * `initiateKYCVerification({ provider: 'ONFIDO' })`. On `onComplete` the parent
 * should start `pollStatus()` against `getMyKYCStatus`.
 */
export interface OnfidoFlowProps {
  /** Onfido SDK token from initiateKYCVerification(ONFIDO). */
  sdkToken: string;
  /** Fired when the applicant finishes the document + selfie capture. */
  onComplete: (data: unknown) => void;
  /** Fired if the SDK errors or fails to load. */
  onError?: (error: unknown) => void;
  /** Optional: user-triggered close / abort. */
  onCancel?: () => void;
  className?: string;
}

export default function OnfidoFlow({
  sdkToken,
  onComplete,
  onError,
  onCancel,
  className,
}: OnfidoFlowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Holds the Onfido instance ({ tearDown }) once mounted.
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      if (!sdkToken || !containerRef.current) return;
      try {
        const onfidoModule: any = await import('onfido-sdk-ui');
        const init = onfidoModule.init ?? onfidoModule.default?.init;
        if (typeof init !== 'function') {
          throw new Error('Onfido SDK init() not available');
        }
        if (cancelled) return;

        instanceRef.current = init({
          token: sdkToken,
          containerEl: containerRef.current,
          useModal: false,
          steps: ['document', 'face', 'complete'],
          onComplete: (data: unknown) => {
            onComplete(data);
          },
          onError: (err: unknown) => {
            onError?.(err);
          },
          onUserExit: () => {
            onCancel?.();
          },
        });
      } catch (err) {
        if (!cancelled) onError?.(err);
      }
    }

    void mount();

    return () => {
      cancelled = true;
      try {
        instanceRef.current?.tearDown?.();
      } catch {
        /* ignore teardown errors */
      }
      instanceRef.current = null;
    };
    // Re-mount only when the token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkToken]);

  return <div ref={containerRef} className={className} />;
}
