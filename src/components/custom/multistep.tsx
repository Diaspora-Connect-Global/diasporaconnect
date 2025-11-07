'use client';
import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { HeadingMedium } from '@/components/utils';
import { Button } from '@/components/ui/button';

interface StepProps {
    stepNumber?: number;
    totalSteps?: number;
    title: string;
    subtitle?: string;
    children: React.ReactNode;

    /** Button state */
    isNextDisabled?: boolean;
    isLoading?: boolean;           // NEW: shows spinner only
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
    isLoading = false,
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
        if (isNextDisabled || isLoading) return;

        if (onNext) {
            try {
                await onNext();
            } catch (error) {
                console.error("Error in next handler:", error);
            }
        }
    };

    const handleBack = () => onBack?.();
    const handleSkip = () => onSkip?.();

    const isButtonDisabled = isNextDisabled || isLoading;

    return (
        <div className="space-y-[2rem]">
            {/* Top Navigation */}
            <div className="lg:h-[1.5rem] lg:flex lg:justify-between">
                {showBackButton ? (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="text-text-primary cursor-pointer flex items-center gap-[0.5rem]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                ) : (
                    <div />
                )}

                {showStepLabel && stepNumber && totalSteps && (
                    <p className="font-label-medium text-text-secondary lg:h-[1.5rem] lg:w-[5.125rem]">
                        Step {stepNumber} of {totalSteps}
                    </p>
                )}
            </div>

            {/* Title & Subtitle */}
            <div className="lg:h-[6.25rem] space-y-[0.25rem]">
                <div className="lg:h-[2.5rem]">
                    <HeadingMedium>{title}</HeadingMedium>
                </div>
                {subtitle && (
                    <div className="lg:h-[3.5rem]">
                        <p className="text-text-secondary">{subtitle}</p>
                    </div>
                )}
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="flex flex-col items-start">
                {children}

                {/* Bottom actions */}
                <div className="lg:mt-[1.5625rem] lg:flex lg:w-full lg:h-[3.75rem] lg:justify-between">
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
                        disabled={isButtonDisabled}
                        variant="outline"
                        className={`
      lg:h-full whitespace-nowrap ml-auto px-8 rounded-full
      min-w-[140px] flex items-center justify-center
      ${isButtonDisabled
                                ? "bg-surface-disabled text-text-secondary cursor-not-allowed"
                                : "bg-surface-brand text-text-white cursor-pointer hover:bg-surface-brand-light"
                            }
    `}
                    >
                        <span className="flex w-full items-center justify-center gap-2">
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                nextButtonText
                            )}
                        </span>
                    </Button>
                </div>
            </form>
        </div>
    );
};