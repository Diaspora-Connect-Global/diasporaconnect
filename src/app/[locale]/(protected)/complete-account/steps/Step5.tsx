// steps/Step4.tsx - Phone Number
import React from 'react';
import { FormData } from '../page';
import { Step } from './Step';
import { HeadingMedium, LabelMedium } from '@/components/utils';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { ArrowLeft } from 'lucide-react';
import { TextInput } from '@/components/custom/input';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface Step4Props {
    data: FormData;
    updateData: (data: Partial<FormData>) => void;
    nextStep: () => void;
    prevStep: () => void;
}


export const Step5: React.FC<Step4Props> = ({ data, updateData, nextStep, prevStep }) => {

     const [value, setValue] = React.useState("")
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
                <LabelMedium className='text-text-secondary'>Step 5 of 7</LabelMedium>
            </div>

            {/* Main Form */}
            <form
                onSubmit={handleSubmit}
                className="flex flex-col items-start px-8 space-y-8 max-w-3xl"
            >
                <HeadingMedium className='space-y-5'>
                    Enter code sent to {data.phoneNumber}
                </HeadingMedium>
                <div className="w-full max-w-md">
               

             <InputOTP
        maxLength={6}
        value={value}
        onChange={(value) => setValue(value)}
      >
        <InputOTPGroup className="justify-center gap-4">
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>

            </div>

               
                <div className="flex justify-end w-full">
                    <Button type='submit' disabled = {!data.phoneNumber.trim()}  variant="outline" className="px-8 h-12 bg-surface-brand hover:bg-blue-700 text-white rounded-full">
                        Submit
                    </Button>
                    
                </div>
            </form>
        </div>
    );
};