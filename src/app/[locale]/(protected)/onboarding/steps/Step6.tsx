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
    const t = useTranslations('onboarding.topics');
    const tActions = useTranslations('actions');
    
    const topics = [
        { key: 'technology', value: t('technology') },
        { key: 'science', value: t('science') },
        { key: 'artsCulture', value: t('artsCulture') },
        { key: 'sports', value: t('sports') },
        { key: 'healthWellness', value: t('healthWellness') },
        { key: 'business', value: t('business') },
        { key: 'entertainment', value: t('entertainment') },
        { key: 'education', value: t('education') },
        { key: 'travel', value: t('travel') },
        { key: 'foodCooking', value: t('foodCooking') },
        { key: 'politics', value: t('politics') },
        { key: 'environment', value: t('environment') }
    ];

    const toggleTopic = (topicKey: string) => {
        const currentTopics = data.topics || [];
        if (currentTopics.includes(topicKey)) {
            updateData({ topics: currentTopics.filter(t => t !== topicKey) });
        } else {
            updateData({ topics: [...currentTopics, topicKey] });
        }
    };

    return (
        <MultiStep
            stepNumber={6}
            totalSteps={7}
            title={t('title')}
            subtitle={t('description')}
            isNextDisabled={false}
            nextButtonText={tActions('continue')}
            showBackButton={false}
            showSkipButton={true}
            onNext={() => nextStep()}
            onBack={prevStep}
            onSkip={() => nextStep()}
        >
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 w-full"> 
                {topics.map((topic) => (
                    <button
                        key={topic.key}
                        type="button"
                        onClick={() => toggleTopic(topic.key)}
                        className={`px-1 py-1 rounded-md border text-text-primary transition-all cursor-pointer text-sm sm:text-base
                            ${
                                data.topics?.includes(topic.key)
                                    ? 'border-border-brand text-text-primary'
                                    : 'bg-surface-brand-subtle  text-text-primary'
                            }`}
                    >
                        {topic.value}
                    </button>
                ))}
            </div>
        </MultiStep>
    );
};