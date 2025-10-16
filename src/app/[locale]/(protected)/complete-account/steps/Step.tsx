'use client';
import React from 'react';
import { FormData } from '../page';
import { ArrowLeft } from 'lucide-react';
import { HeadingMedium, LabelMedium } from '@/components/utils';
import { Button } from '@/components/ui/button';

interface StepProps {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep?: () => void;
    stepNumber: number;
    totalSteps: number;
    title: string;
    children: React.ReactNode;
    isNextDisabled: boolean;
    nextButtonText?: string;

    /** Optional custom submit handler for async actions or validations */
    onSubmit?: (data: FormData) => Promise<void> | void;
}

export const Step: React.FC<StepProps> = ({ 
    data, 
    updateData, 
    nextStep, 
    prevStep, 
    stepNumber, 
    totalSteps, 
    title, 
    children,
    isNextDisabled,
    nextButtonText = "Continue",
    onSubmit,
}) => {
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isNextDisabled) return;

        // 🔹 If a custom submit handler exists, run it.
        if (onSubmit) {
            try {
                await onSubmit(data);
            } catch (error) {
                console.error("Error in custom submit:", error);
            }
            return; // don't auto-call nextStep here (manual control)
        }

        // 🔹 Default behavior: proceed to next step
        nextStep();
    };

    return (
        <div className="w-[80%] mx-auto min-h-screen flex flex-col justify-start">
            {/* Top Navigation */}
            <div className="space-y-8 flex justify-between items-center px-8 py-6">
                <button
                    type="button"
                    onClick={prevStep}
                    className="text-gray-700 hover:text-black flex items-center gap-2"
                >
                    <ArrowLeft size={20} />
                </button>
                <LabelMedium className="text-text-secondary">
                    Step {stepNumber} of {totalSteps}
                </LabelMedium>
            </div>

            {/* Main Form */}
            <form
                onSubmit={handleSubmit}
                className="flex flex-col items-start px-8 space-y-8 max-w-3xl"
            >
                <HeadingMedium className="space-y-5">{title}</HeadingMedium>

                {children}

                <div className="flex justify-between w-full">                    <Button 
                        type="submit" 
                        disabled={isNextDisabled}  
                        variant="outline" 
                        className="px-8 h-12 bg-surface-brand hover:bg-blue-700 text-white rounded-full"
                    >
                        {nextButtonText}
                    </Button>
                </div>
            </form>
        </div>
    );
};
