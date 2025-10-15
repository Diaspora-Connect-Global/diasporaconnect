'use client';
import React from 'react';
import { FormData } from '../page';
import { TextInput } from '@/components/custom/input';
import { Step } from './Step';

interface Step1Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep?: () => void;
}

export const Step1: React.FC<Step1Props> = ({ data, updateData, nextStep, prevStep }) => {
    const isNextDisabled = !data.firstName.trim() || !data.lastName.trim();

    return (
        <Step
            data={data}
            updateData={updateData}
            nextStep={nextStep}
            prevStep={prevStep}
            stepNumber={1}
            totalSteps={7}
            title="What's your name?"
            isNextDisabled={isNextDisabled}
        >
            <div className="space-y-8 flex justify-between gap-6 w-full">
                <div className="flex-1">
                    <TextInput
                        label="First name"
                        placeholder="Your first name"
                        value={data.firstName}
                        onChange={(value) => updateData({ firstName: value })}
                        id="firstName"
                    />
                </div>

                <div className="flex-1">
                    <TextInput
                        label="Last name"
                        placeholder="Your last name"
                        value={data.lastName}
                        onChange={(value) => updateData({ lastName: value })}
                        id="lastName"
                    />
                </div>
            </div>
        </Step>
    );
};
