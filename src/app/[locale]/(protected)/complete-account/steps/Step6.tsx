// steps/Step4.tsx - Phone Number
import React from 'react';
import { FormData } from '../page';
import { Step } from './Step';
import { HeadingMedium, LabelMedium } from '@/components/utils';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { ArrowLeft } from 'lucide-react';
import { TextInput } from '@/components/custom/input';
import { Button } from '@/components/ui/button';

interface Step6Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}


export const Step6: React.FC<Step6Props> = ({ data, updateData, nextStep, prevStep }) => {
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
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (data.phoneNumber.trim()) {
            nextStep();
        }
    };

    return (
        <div className="w-[80%] mx-auto min-h-screen flex  flex-col justify-start">
            {/* Top Navigation */}
            <div className="space-y-8   flex justify-between items-center px-8 py-6">
                <button
                    type="button"
                    onClick={prevStep}
                    className="text-gray-700 hover:text-black flex items-center gap-2"
                >
                    <ArrowLeft size={20} />
                </button>
                <LabelMedium className='text-text-secondary'>Step 6 of 7</LabelMedium>
            </div>

            {/* Main Form */}
            <form
                onSubmit={handleSubmit}
                className="flex flex-col items-start px-8 space-y-8 max-w-3xl"
            >
                <HeadingMedium className='space-y-5'>
                    What topics do you want to see on  DCG
                </HeadingMedium>
                <div className="flex flex-wrap gap-4 w-full">
                
               
         {topics.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => updateData({ topics: [option] })}
            className={`px-6 py-3 rounded-md border text-text-secondary  transition-all
              ${
                data.topics.includes(option)
                  ? 'bg-surface-brand border-border-brand'
                  : 'bg-surface-brand-subtle border-border-brand hover:border-blue-500 hover:text-blue-600'
              }`}
          >
            {option}
          </button>
        ))}

            </div>

               
                <div className="flex justify-end w-full">
                    <Button type='submit' disabled = {!data.phoneNumber.trim()}  variant="outline" className="px-8 h-12 bg-surface-brand hover:bg-blue-700 text-white rounded-full">
                        Continue
                    </Button>
                    
                </div>
            </form>
        </div>
    );
};