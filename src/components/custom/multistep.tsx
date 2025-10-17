'use client';
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { HeadingMedium } from '@/components/utils';
import { Button } from '@/components/ui/button';

interface StepProps {
    stepNumber?: number;
    totalSteps?: number;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    isNextDisabled?: boolean;
    nextButtonText?: string;

    /** Show/hide components */
    showBackButton?: boolean;
    showStepLabel?: boolean;
    showSkipButton?: boolean;

    /** Custom handlers */
    onNext?: () => Promise<void> | void;
    onBack?: () => void;
    onSkip?: () => void;
}

export const MultiStep: React.FC<StepProps> = ({
    stepNumber,
    totalSteps,
    title,
    subtitle,
    children,
    isNextDisabled = false,
    nextButtonText = "Continue",
    showBackButton = true,
    showStepLabel = true,
    showSkipButton = true,
    onNext,
    onBack,
    onSkip,
}) => {
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isNextDisabled) return;

        if (onNext) {
            try {
                await onNext();
            } catch (error) {
                console.error("Error in next handler:", error);
            }
        }
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        }
    };

    const handleSkip = () => {
        if (onSkip) {
            onSkip();
        }
    };

    return (
        <div className="w-[70%] mx-auto min-h-screen flex flex-col justify-start ">
            {/* Top Navigation */}
            <div className="space-y-4 flex justify-between items-center px-1 py-6 ">
                {showBackButton ? (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="text-text-primary cursor-pointer flex items-center gap-2"
                    >
                        <ArrowLeft size={20} />
                    </button>
                ) : (
                    <div />
                )}

                {showStepLabel && stepNumber && totalSteps && (
                    <p className=" font-label-medium text-text-secondary">
                        Step {stepNumber} of {totalSteps}
                    </p>
                )}
            </div>

            {/* Main Form */}
            <form
                onSubmit={handleSubmit}
                className="flex flex-col items-start  space-y-8  "
            >
                <div >
                <HeadingMedium >{title}</HeadingMedium>
                <p className="text-text-secondary">
                        {subtitle}
                    </p>

                </div>

                {children}

                <div className="flex w-full">
                    {showSkipButton && (
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="font-label-large text-text-brand cursor-pointer"
                        >
                            Skip
                        </button>
                    )}

                    <Button
                        type="submit"
                        disabled={isNextDisabled}
                        variant="outline"
                        className="ml-auto px-8 h-12 bg-surface-brand hover:bg-surface-brand-light text-text-white rounded-full cursor-pointer"
                    >
                        {nextButtonText}
                    </Button>
                </div>
            </form>
        </div>
    );
};