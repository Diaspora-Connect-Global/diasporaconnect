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
        <div className='space-y-[2rem]'> {/* 32px equivalent */}
            {/* Top Navigation */}
            <div className="lg:h-[1.5rem] lg:flex lg:justify-between"> {/* 24px equivalent */}
                {showBackButton ? (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="text-text-primary cursor-pointer flex items-center gap-[0.5rem]" /* 8px equivalent */
                    >
                        <ArrowLeft size={20} />
                    </button>
                ) : (
                    <div />
                )}

                {showStepLabel && stepNumber && totalSteps && (
                    <p className="font-label-medium text-text-secondary lg:h-[1.5rem] lg:w-[5.125rem]"> {/* 24px, 82px equivalent */}
                        Step {stepNumber} of {totalSteps}
                    </p>
                )}
            </div>

            <div className='lg:h-[6.25rem] space-y-[0.25rem]'> {/* 100px, 4px equivalent */}
                <div className='lg:h-[2.5rem]'> {/* 40px equivalent */}
                    <HeadingMedium>{title}</HeadingMedium>
                </div>
                <div className='lg:h-[3.5rem]'> {/* 56px equivalent */}
                    <p className="text-text-secondary">
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* Main Form */}
            <form
                onSubmit={handleSubmit}
                className="flex flex-col items-start"
            >
                {children}

                <div className="lg:mt-[1.5625rem] lg:flex lg:w-full lg:h-[3.75rem] lg:justify-between"> {/* 25px, 60px equivalent */}
                    {showSkipButton && (
                        <button
                            type="button"
                            onClick={handleSkip}
                            className="font-label-large lg:h-full text-text-brand cursor-pointer"
                        >
                            Skip
                        </button>
                    )}
                    <Button
                        type="submit"
                        disabled={isNextDisabled}
                        variant="outline"
                        className={`lg:h-full whitespace-nowrap  ml-auto px-8 hover:bg-surface-brand-light rounded-full ${isNextDisabled ? "bg-surface-disabled text-text-secondary cursor-not-allowed" : "bg-surface-brand text-text-white cursor-pointer"}`} /* 180px equivalent */
                    >
                        {nextButtonText}
                    </Button>
                </div>
            </form>
        </div>
    );
};