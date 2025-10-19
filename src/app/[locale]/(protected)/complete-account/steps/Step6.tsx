// steps/Step6.tsx - Topics Selection
import React from 'react';
import { FormData } from '../page';
import { MultiStep } from '@/components/custom/multistep';
import { useTranslations } from 'next-intl';

interface Step6Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}

export const Step6: React.FC<Step6Props> = ({ data, updateData, nextStep, prevStep }) => {
    const t = useTranslations('onboarding');
    const tActions = useTranslations('actions');
    
    const topics = [
        'Technology',
        'Science',
        'Arts & Culture',
        'Sports',
        'Health & Wellness',
        'Business',
        'Entertainment',
        'Education',
        'Travel',
        'Food & Cooking',
        'Politics',
        'Environment'
    ];

    const toggleTopic = (topic: string) => {
        const currentTopics = data.topics || [];
        if (currentTopics.includes(topic)) {
            updateData({ topics: currentTopics.filter(t => t !== topic) });
        } else {
            updateData({ topics: [...currentTopics, topic] });
        }
    };

    return (
        <MultiStep
            stepNumber={6}
            totalSteps={7}
            title={t('topics.title')}
            subtitle={t('topics.description')}
            isNextDisabled={false}
            nextButtonText={tActions('continue')}
            showBackButton={true}
            showSkipButton={true}
            onNext={() => nextStep()}
            onBack={prevStep}
            onSkip={() => nextStep()}
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 w-full"> {/* Adjusted grid for better fit */}
                {topics.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => toggleTopic(option)}
                        className={`px-1 py-1 rounded-md border text-text-primary transition-all cursor-pointer text-sm sm:text-base
                            ${
                                data.topics?.includes(option)
                                    ? 'border-border-brand text-text-primary'
                                    : 'bg-surface-brand-subtle  text-text-primary'
                            }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </MultiStep>
    );
};