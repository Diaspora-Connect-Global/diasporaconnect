// steps/Step4.tsx - Phone Number
import React from 'react';
import { FormData } from '../page';
import { Step } from './Step';
import { HeadingMedium, LabelMedium } from '@/components/utils';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { ArrowLeft } from 'lucide-react';
import { TextInput } from '@/components/custom/input';
import { Button } from '@/components/ui/button';

interface Step7Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}


export const Step7: React.FC<Step7Props> = ({ data, updateData, nextStep, prevStep }) => {
     const communities = [
    'Technology',
    
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
                <LabelMedium className='text-text-secondary'>Step 7 of 7</LabelMedium>
            </div>

            {/* Main Form */}
            <form
                onSubmit={handleSubmit}
                className="flex flex-col items-start px-8 space-y-8 max-w-3xl"
            >
                <HeadingMedium className='space-y-5'>
                   Here are recommendations to get started
                </HeadingMedium>
                <div className="w-full max-w-md">
                
               
         {communities.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => updateData({ community: option })}
            className={`px-6 py-3 rounded-md border text-text-secondary  transition-all
              ${
                data.community === option
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
                       FInish
                    </Button>
                    
                </div>
            </form>
        </div>
    );
};