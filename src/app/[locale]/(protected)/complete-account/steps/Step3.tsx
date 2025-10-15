'use client'
import React from 'react';
import { FormData } from '../page';
import { Step } from './Step';
import { LabelMedium } from '@/components/utils';

interface Step3Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}

export const Step3: React.FC<Step3Props> = ({ data, updateData, nextStep, prevStep }) => {
    const countries = [
        'United States',
        'Canada',
        'United Kingdom',
        'Australia',
        'Germany',
        'France',
        'Japan',
        'India',
        'Brazil',
        'Other'
    ];

    const isNextDisabled = !data.country?.trim();

    return (
        <Step
            data={data}
            updateData={updateData}
            nextStep={nextStep}
            prevStep={prevStep}
            stepNumber={3}
            totalSteps={7}
            title="What is your country of residence ?"
            isNextDisabled={isNextDisabled}
        >
            <div className="w-full max-w-md">
                <label
                    htmlFor="country"
                    className="block text-sm font-medium mb-2"
                >
                    <LabelMedium>
                        Country
                    </LabelMedium>
                </label>
                <select
                    id="country"
                    value={data.country || ''}
                    onChange={(e) => updateData({ country: e.target.value })}
                    className="w-full px-3 py-2 border border-border-subtle rounded-md bg-surface-subtle text-text-primary focus:outline-none focus:ring-2  focus:border-transparent transition"
                >
                    <option value="" disabled>
                        Select your country
                    </option>
                    {countries.map((country) => (
                        <option key={country} value={country}>
                            {country}
                        </option>
                    ))}
                </select>
            </div>
        </Step>
    );
};
