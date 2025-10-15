// steps/Step4.tsx - Phone Number
import React from 'react';
import { FormData } from '../page';
import { Step } from './Step';
import { HeadingMedium, LabelMedium } from '@/components/utils';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { ArrowLeft } from 'lucide-react';
import { TextInput } from '@/components/custom/input';
import { Button } from '@/components/ui/button';

interface Step4Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}


export const Step4: React.FC<Step4Props> = ({ data, updateData, nextStep, prevStep }) => {
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
                <LabelMedium className='text-text-secondary'>Step 4 of 7</LabelMedium>
            </div>

            {/* Main Form */}
            <form
                onSubmit={handleSubmit}
                className="flex flex-col items-start px-8 space-y-8 max-w-3xl"
            >
                <HeadingMedium className='space-y-5'>
                    Let’s send you a confirmation code
                </HeadingMedium>
                <div className="w-full max-w-md">
                <label
                    htmlFor="country"
                    className="block text-sm font-medium mb-2"
                >
                    <LabelMedium>
                        Phone Number

                    </LabelMedium>
                </label>

                <InputGroup className='bg-surface-subtle' >
                    <InputGroupAddon>
                        <InputGroupText>flag</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupAddon >
                        <InputGroupText className='text-text-primary'>+233</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput onChange={(e) => updateData({ phoneNumber: e.target.value })}  placeholder="Mobile Number" className='text-text-primary font-body-large ' />
                </InputGroup>

            </div>

               
                <div className="flex justify-end w-full">
                    <Button type='submit' disabled = {!data.phoneNumber.trim()}  variant="outline" className="px-8 h-12 bg-surface-brand hover:bg-blue-700 text-white rounded-full">
                        Send Code
                    </Button>
                    
                </div>
            </form>
        </div>
    );
};