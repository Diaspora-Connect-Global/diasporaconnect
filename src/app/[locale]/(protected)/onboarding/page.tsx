'use client';

import { useState, useEffect } from 'react';
import { Step1 } from './steps/Step1';
import { Step2 } from './steps/Step2';
import { Step3 } from './steps/Step3';
import { Step4 } from './steps/Step4';
import { Step5 } from './steps/Step5';
import { Step6 } from './steps/Step6';
import { Step7 } from './steps/Step7';
import { useMutation } from '@apollo/client/react';
import { REGISTER_USER, RegisterUserResponse, VERIFY_OTP, VerifyOtpResponse } from '@/services/gql/authentication';
import { redirect, useRouter } from 'next/navigation';
import { toast } from 'sonner';


export interface FormData {
  // Step 1
  firstName: string;
  lastName: string;

  // Step 2
  community: Array<{
    title: string;
    members: number;
    description: string;
  }>;
  // Step 3
  country: string;
  countryCode?: string;
  communityType: string

  // Step 4
  phoneNumber: string;

  // Step 5
  verificationCode: string;

  // Step 6
  topics: string[];

  // Step 7
  recommendations: string[];
}

export default function CompleteAccount() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    community: [],
    communityType: "",
    country: '',
    phoneNumber: '',
    verificationCode: '',
    topics: [],
    recommendations: []
  });
  const [sendCodeLoading, setSendCodeLoading] = useState(false)
  const [verifyOTPLoading, setVerifyOTPLoading] = useState(false)
  const router = useRouter();


  const [verifyOtp, { loading: verifyOtpLoading, error }] = useMutation<VerifyOtpResponse>(VERIFY_OTP);
  const [registerUser, { loading: registerUserLoading, error: registerUserError }] = useMutation<RegisterUserResponse>(REGISTER_USER);

   // Load from session storage on component mount
  useEffect(() => {
    const savedData = sessionStorage.getItem('accountFormData');
    const savedStep = sessionStorage.getItem('accountFormStep');
     const emailpresent = sessionStorage.getItem('signupEmail');
    const passwordpresent = sessionStorage.getItem('signupPassword');

    
if(!emailpresent || !passwordpresent){
  redirect("/signup")

}

    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
    if (savedStep) {
      setCurrentStep(parseInt(savedStep));
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('accountFormData', JSON.stringify(formData));
    sessionStorage.setItem('accountFormStep', currentStep.toString());
  }, [formData, currentStep]);


  const updateFormData = (newData: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 7));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const submitFormA = async () => {
    try {
      setSendCodeLoading(true);
      const email = sessionStorage.getItem('signupEmail');
      const password = sessionStorage.getItem('signupPassword');

      console.log("Sending OTP...", formData, email, password);

      /**
     * Formats phone number to E.164 format for Ghana (`${formData.countryCode}`)
     * - If 10 digits starting with 0: Remove 0 and add `${formData.countryCode}`
     * - If 9 digits: Add `${formData.countryCode}`
     * - If already has `${formData.countryCode}`: Keep as is
     * - Other formats: Keep as entered
     */
      const formatPhoneToE164 = (phone: string): string => {
        // Remove all non-digit characters except +
        const cleaned = phone.replace(/[^\d+]/g, '');

        // Already in E.164 format
        if (cleaned.startsWith(`${formData.countryCode}`)) {
          return cleaned;
        }

        // Remove + if present (for other formats)
        const digitsOnly = cleaned.replace(/\+/g, '');

        // 10 digits starting with 0 (e.g., 0551810814)
        if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
          return `${formData.countryCode}` + digitsOnly.substring(1);
        }

        // 9 digits (e.g., 551810814)
        if (digitsOnly.length === 9) {
          return `${formData.countryCode}` + digitsOnly;
        }

        // Return as is if doesn't match Ghana format
        return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
      };

      const formatted = formatPhoneToE164(formData.phoneNumber);


      const { data } = await registerUser({
        variables: {
          input: {
            email: email,
            password: password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formatted,
            country: "GH",
            role: formData.communityType
          }
        }
      });

      console.log("Registration response:", data);

      if (data?.registerUser.success) {
        // Store registration token for OTP verification
        const token = data.registerUser.registrationToken;
        // OTP sent → move to next step
        sessionStorage.setItem('registrationToken', token);
        nextStep();
      }else{
        toast.error(data?.registerUser.message)
      }


    } catch (error) {
      console.error('Error sending OTP:', error);
      // Optionally show error toast
    } finally {
      setSendCodeLoading(false);
    }
  };


  const submitFormB = async () => {
    try {
      console.log("Verifying OTP...", formData);
      setVerifyOTPLoading(true)
      const registrationToken = sessionStorage.getItem('registrationToken');

      const { data } = await verifyOtp({
        variables: {
          registrationToken: registrationToken,
          otp: formData.verificationCode
        }
      });

      console.log("OTP Verification response:", data);

      if (data?.verifyRegistrationOtp.success) {
        toast.success('Phone number verified successfully!');
        sessionStorage.setItem("sessionToken", data?.verifyRegistrationOtp.sessionToken)
        sessionStorage.setItem("userInfo", JSON.stringify(data?.verifyRegistrationOtp.user))
        nextStep();
      } else {
        toast.error('OTP verification failed. Please try again.');
      }
    } catch (error) {
      console.error('OTP verification failed:', error);
      // Show error in UI
    } finally {
      setVerifyOTPLoading(false)

    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1
            data={formData}
            updateData={updateFormData}
            nextStep={nextStep}
          />
        );
      case 2:
        return (
          <Step2
            data={formData}
            updateData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 3:
        return (
          <Step3
            data={formData}
            updateData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 4:
        return (
          <Step4
            data={formData}
            updateData={updateFormData}
            nextStep={submitFormA}
            loading={sendCodeLoading}
            prevStep={prevStep}
          />
        );
      case 5:
        return (
          <Step5
            data={formData}
            updateData={updateFormData}
            nextStep={submitFormB}
            loading={verifyOTPLoading}
            prevStep={prevStep}
          />
        );
      case 6:
        return (
          <Step6
            data={formData}
            updateData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 7:
        return (
          <Step7
            data={formData}
            updateData={updateFormData}
            prevStep={prevStep}
            nextStep={nextStep}

          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {renderStep()}
    </>
  );
};

