/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTranslations } from 'next-intl';
import { FileUp, Info } from 'lucide-react';
import { StepFrame } from '@/components/vendor-onboarding/StepFrame';

import React, { useState } from "react";

const PdfUpload: React.FC = () => {
  const t = useTranslations('vendorOnboarding.documents');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;

    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError(t('errorPdf'));
        setFile(null);
      } else {
        setError(null);
        setFile(selectedFile);
      }
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="file-upload" className="relative block cursor-pointer">
        <input
          id="file-upload"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="peer sr-only"
          aria-describedby="file-upload-hint"
        />
        <span className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-brand bg-surface-brand-subtle p-4 text-center transition-colors hover:bg-surface-info peer-focus-visible:ring-2 peer-focus-visible:ring-text-brand peer-focus-visible:ring-offset-2">
          <FileUp className="size-6 text-text-brand" strokeWidth={1.75} aria-hidden />
          <span className="text-sm font-semibold text-text-brand">{t('upload')}</span>
          <span id="file-upload-hint" className="text-xs text-muted-foreground">{t('supported')}</span>
        </span>
      </label>

      {file && <p className="break-words text-sm text-text-success">{t('selected', { name: file.name })}</p>}
      {error && <p role="alert" className="text-sm text-text-danger">{error}</p>}
    </div>
  );
};

export default PdfUpload;


interface Step2Props {
    data?: any;
    updateData: (data: Partial<any>) => void;
    nextStep: () => void;
    prevStep: () => void;
    onSubmit?: () => void;
    isSubmitting?: boolean;
}

export const Step2: React.FC<Step2Props> = ({ nextStep, prevStep, onSubmit, isSubmitting = false }) => {
    const t = useTranslations('vendorOnboarding.documents');
    const tActions = useTranslations('actions');

    const isNextDisabled = isSubmitting;

    return (
        <StepFrame
            id="vendor-documents-title"
            number={3}
            title={t('title')}
            subtitle={t('subtitle')}
            isNextDisabled={isNextDisabled}
            nextText={tActions('submit')}
            onNext={() => {
                if (onSubmit) {
                    onSubmit();
                    return;
                }
                nextStep();
            }}
            onBack={() => prevStep()}
        >
            <PdfUpload />

            <div className="flex items-start gap-2 rounded-xl bg-surface-info p-3 text-sm text-text-info">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <ul className="space-y-1">
                    <li>{t('noteOneFile')}</li>
                    <li>{t('notePdf')}</li>
                    <li>{t('noteSize')}</li>
                </ul>
            </div>
        </StepFrame>
    );
};
