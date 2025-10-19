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
        <div className='space-y-[calc(32/922*100vh)]' >
            {/* Top Navigation */}
            <div className="lg:h-[calc(24/922*100vh)]  lg:flex lg:justify-between">
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
                    <p className=" font-label-medium text-text-secondary lg:h-[calc(24/922*100vh)]  lg:w-[calc(82/1512*100vw)]">
                        Step {stepNumber} of {totalSteps}
                    </p>
                )}
            </div>

            <div className='lg:h-[calc(100/922*100vh)] space-y-[calc(4/922*100vh)]'>
                <div className='lg:h-[calc(40/922*100vh)]'>
                    <HeadingMedium >{title}</HeadingMedium>
                </div>
                <div className='lg:h-[calc(56/922*100vh)]'>
                    <p className="text-text-secondary">
                        {subtitle}
                    </p>
                </div>

            </div>

            {/* Main Form */}
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col items-start "
                >


                    {children}

                    <div className="lg:mt-[calc(25/922*100vh)] lg:flex lg:w-full lg:h-[calc(60/922*100vh)] lg:justify-between ">
                        {showSkipButton && (
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="font-label-large lg-h-full text-text-brand cursor-pointer"
                            >
                                Skip
                            </button>
                        )}
                        <Button
                            type="submit"
                            disabled={isNextDisabled}
                            variant="outline"
                            className={`lg:h-full lg:w-[calc(180/1512*100vw)] ml-auto px-8  hover:bg-surface-brand-light  rounded-full  ${isNextDisabled ? "bg-surface-disabled text-text-secondary cursor-not-allowed" : "bg-surface-brand text-text-white cursor-pointer"}    `}
                        >
                            {nextButtonText}
                        </Button>
                    </div>
                </form>

        </div>
    );
};