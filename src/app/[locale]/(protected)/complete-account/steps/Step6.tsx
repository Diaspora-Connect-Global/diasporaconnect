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
            <div className="flex flex-wrap gap-4 w-full">
                {topics.map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => toggleTopic(option)}
                        className={`px-2 py-2 rounded-md border text-text-primary transition-all cursor-pointer
                            ${
                                data.topics?.includes(option)
                                    ? 'bg-surface-brand-light '
                                    : 'bg-surface-brand-subtle border-border-disabled hover:border-border-disabled hover:bg-surface-brand-subtle'
                            }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </MultiStep>
    );
};