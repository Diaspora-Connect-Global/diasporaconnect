/* eslint-disable @typescript-eslint/no-explicit-any */
import { MultiStep } from '@/components/custom/multistep';
import { useTranslations } from 'next-intl';
import { FileArrowUpIcon, InfoIcon } from '@phosphor-icons/react';


import React, { useState } from "react";

const PdfUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;

    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Only PDF files are supported.");
        setFile(null);
      } else {
        setError(null);
        setFile(selectedFile);
      }
    }
  };



  return (
    <div className="">
      <label
        htmlFor="file-upload"
        className="cursor-pointer text-text-brand underline pl-4"
      >
        <FileArrowUpIcon size={18} className="inline-block mr-2 text-text-secondary" />
        Upload document
      </label>
      <input
        id="file-upload"
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="text-sm text-text-secondary my-5">Supported files - pdf</p>

      {file && <p className="my-2 text-text-success">Selected: {file.name}</p>}
      {error && <p className="my-2 text-text-danger">{error}</p>}

      
    </div>
  );
};

export default PdfUpload;


interface Step2Props {
    data?: any;
    updateData: (data: Partial<any>) => void;
    nextStep: () => void; 
    prevStep: () => void;
}

export const Step2: React.FC<Step2Props> = ({ data, nextStep, prevStep }) => {
    const t = useTranslations('passwordReset');
    const tActions = useTranslations('actions');


    const isNextDisabled = false; // Add your validation logic here

    return (
        <MultiStep
            stepNumber={2}
            totalSteps={3}
            title={"Add business documents"}
            subtitle={"Upload documents relating to your business.  Vendors adding documents has more credibility and trust on the marketplace"}
            isNextDisabled={isNextDisabled}
            nextButtonText={tActions('submit')}
            showBackButton={true}
            showSkipButton={false}
            onNext={() => nextStep()}
            onBack={() => prevStep()}
            showStepLabel={false}
        >
            <div className="w-full">



         <PdfUpload />




                <div className="bg-surface-info text-text-info flex p-2 space-x-2 rounded-md">
                    <div>

                        <InfoIcon size={20} />
                    </div>
                    <div>
                    <p>All documents should be put together and uploaded as one file.
                    </p>
                    <p>Supported document upload is pdf.
                    </p>
                    <p>File size must not be more than 1Mb.</p>

                    </div>
                </div>
            </div>
        </MultiStep>
    );
};