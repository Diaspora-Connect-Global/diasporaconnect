"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { MultiStep } from "@/components/custom/multistep";
import { LabelMedium, TextPrimary } from "@/components/utils";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  COMPLETE_OAUTH_REGISTRATION,
  VERIFY_OTP,
  CompleteOAuthRegistrationInput,
  CompleteOAuthRegistrationResponse,
  VerifyOtpResponse,
} from "@/services/gql/authentication";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface OAuthRegistrationData {
  oauthRegistrationToken: string;
  email: string;
  firstName: string;
  lastName: string;
  provider: string;
  phoneVerificationRequired: boolean;
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  countryCode: string;
  role: "diaspora" | "local";
  verificationCode: string;
}

const COUNTRIES = [
  { code: "GH", name: "Ghana", dialCode: "+233" },
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "NG", name: "Nigeria", dialCode: "+234" },
];

export default function CompleteOAuthRegistrationPage() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tActions = useTranslations("actions");
  const { setTokens, setUser, setDeviceMetadata } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState<OAuthRegistrationData | null>(null);
  const [registrationToken, setRegistrationToken] = useState("");
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
    country: "GH",
    countryCode: "+233",
    role: "local",
    verificationCode: "",
  });

  const [completeRegistration, { loading: registerLoading }] = useMutation<CompleteOAuthRegistrationResponse>(
    COMPLETE_OAUTH_REGISTRATION,
    {
      onCompleted: (data) => {
        if (data.completeOAuthRegistration.success) {
          const token = data.completeOAuthRegistration.registrationToken;
          setRegistrationToken(token);
          toast.success(data.completeOAuthRegistration.message || "Code sent successfully!");
          nextStep();
        } else {
          toast.error(data.completeOAuthRegistration.message || "Registration failed");
        }
      },
      onError: (error) => {
        console.error("Registration error:", error);
        toast.error(error.message || "An error occurred. Please try again.");
      },
    }
  );

  const [verifyOtp, { loading: verifyLoading }] = useMutation<VerifyOtpResponse>(VERIFY_OTP, {
    onCompleted: (data) => {
      if (data.verifyRegistrationOtp.success) {
        const { sessionToken, user, deviceMetadata, requires2fa } = data.verifyRegistrationOtp;

        setTokens({
          accessToken: sessionToken,
          refreshToken: "",
          sessionId: deviceMetadata.deviceId,
          expiresIn: 3600,
        });

        setUser({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });

        setDeviceMetadata(deviceMetadata);

        localStorage.removeItem("oauth_registration");
        toast.success("Phone number verified successfully!");

        if (requires2fa) {
          router.push("/auth/setup-2fa");
        } else {
          router.push("/dashboard");
        }
      } else {
        toast.error(data.verifyRegistrationOtp.message || "Invalid verification code");
      }
    },
    onError: (error) => {
      console.error("Verification error:", error);
      toast.error(error.message || "Verification failed. Please try again.");
    },
  });

  useEffect(() => {
    const data = localStorage.getItem("oauth_registration");
    if (!data) {
      router.push("/login");
      return;
    }

    const parsed = JSON.parse(data) as OAuthRegistrationData;
    setRegistrationData(parsed);

    setFormData((prev) => ({
      ...prev,
      firstName: parsed.firstName || "",
      lastName: parsed.lastName || "",
    }));
  }, [router]);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find((c) => c.code === countryCode);
    if (country) {
      updateFormData({
        country: country.code,
        countryCode: country.dialCode,
      });
    }
  };

  const formatPhoneToE164 = (phone: string): string => {
    const cleaned = phone.replace(/[^\d+]/g, "");

    if (cleaned.startsWith(formData.countryCode)) {
      return cleaned;
    }

    const digitsOnly = cleaned.replace(/\+/g, "");

    if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
      return formData.countryCode + digitsOnly.substring(1);
    }

    if (digitsOnly.length === 9) {
      return formData.countryCode + digitsOnly;
    }

    return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
  };

  const handleSendCode = async () => {
    if (!registrationData?.oauthRegistrationToken) {
      toast.error("Invalid registration session. Please try logging in again.");
      return;
    }

    const formatted = formatPhoneToE164(formData.phone);

    await completeRegistration({
      variables: {
        input: {
          oauthRegistrationToken: registrationData.oauthRegistrationToken,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formatted,
          country: formData.country,
          role: formData.role,
        } as CompleteOAuthRegistrationInput,
      },
    });
  };

  const handleVerifyOtp = async () => {
    if (!registrationToken) {
      toast.error("No registration token found");
      return;
    }

    await verifyOtp({
      variables: {
        registrationToken,
        otp: formData.verificationCode,
      },
    });
  };

  if (!registrationData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Step 1: Basic Info
  if (currentStep === 1) {
    const isNextDisabled = !formData.firstName.trim() || !formData.lastName.trim();

    return (
      <MultiStep
        stepNumber={1}
        totalSteps={4}
        title="Complete Your Profile"
        subtitle={`Welcome, ${registrationData.firstName}! Let's complete your registration.`}
        isNextDisabled={isNextDisabled}
        nextButtonText={tActions("continue")}
        showBackButton={false}
        showSkipButton={false}
        onNext={nextStep}
      >
        <div className="w-full space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Signed in with {registrationData.provider} as {registrationData.email}
          </div>

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-2">
              <LabelMedium>First Name</LabelMedium>
            </label>
            <input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => updateFormData({ firstName: e.target.value })}
              className="w-full px-3 py-3 border border-border-default rounded-sm bg-surface-subtle text-text-primary focus:outline-none focus:ring-0"
              placeholder="Enter your first name"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-2">
              <LabelMedium>Last Name</LabelMedium>
            </label>
            <input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => updateFormData({ lastName: e.target.value })}
              className="w-full px-3 py-3 border border-border-default rounded-sm bg-surface-subtle text-text-primary focus:outline-none focus:ring-0"
              placeholder="Enter your last name"
            />
          </div>
        </div>
      </MultiStep>
    );
  }

  // Step 2: Country & Role
  if (currentStep === 2) {
    return (
      <MultiStep
        stepNumber={2}
        totalSteps={4}
        title="Where are you based?"
        subtitle="Select your country and account type"
        isNextDisabled={false}
        nextButtonText={tActions("continue")}
        showBackButton={true}
        showSkipButton={false}
        onNext={nextStep}
        onBack={prevStep}
      >
        <div className="w-full space-y-4">
          <div>
            <label htmlFor="country" className="block text-sm font-medium mb-2">
              <LabelMedium>Country</LabelMedium>
            </label>
            <select
              id="country"
              value={formData.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3 py-3 border border-border-default rounded-sm bg-surface-subtle text-text-primary focus:outline-none focus:ring-0"
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <LabelMedium>Account Type</LabelMedium>
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-border-default rounded-sm cursor-pointer hover:bg-surface-subtle">
                <input
                  type="radio"
                  name="role"
                  value="local"
                  checked={formData.role === "local"}
                  onChange={(e) => updateFormData({ role: e.target.value as "local" | "diaspora" })}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-text-primary">Local</div>
                  <div className="text-sm text-text-secondary">I am based in Ghana</div>
                </div>
              </label>
              <label className="flex items-center p-3 border border-border-default rounded-sm cursor-pointer hover:bg-surface-subtle">
                <input
                  type="radio"
                  name="role"
                  value="diaspora"
                  checked={formData.role === "diaspora"}
                  onChange={(e) => updateFormData({ role: e.target.value as "local" | "diaspora" })}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-text-primary">Diaspora</div>
                  <div className="text-sm text-text-secondary">I am based outside Ghana</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </MultiStep>
    );
  }

  // Step 3: Phone Number
  if (currentStep === 3) {
    const isNextDisabled = !formData.phone.trim();

    return (
      <MultiStep
        isLoading={registerLoading}
        stepNumber={3}
        totalSteps={4}
        title="Phone Verification"
        subtitle="We'll send a verification code to your phone"
        isNextDisabled={isNextDisabled}
        nextButtonText={tActions("sendCode")}
        showBackButton={true}
        showSkipButton={false}
        onNext={handleSendCode}
        onBack={prevStep}
      >
        <div className="w-full">
          <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2">
            <LabelMedium>Phone Number</LabelMedium>
          </label>

          <InputGroup className="px-3 py-6 border-1 border-border-default rounded-sm bg-surface-subtle text-text-primary focus:outline-none focus:ring-0 transition">
            <InputGroupAddon>
              <InputGroupText>
                <Image
                  src={`https://flagcdn.com/w20/${formData.country.toLowerCase()}.png`}
                  alt="Flag"
                  width={25}
                  height={15}
                />
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupAddon>
              <InputGroupText className="text-text-primary">
                <TextPrimary>{formData.countryCode}</TextPrimary>
              </InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              onChange={(e) => updateFormData({ phone: e.target.value })}
              value={formData.phone || ""}
              placeholder="551810814"
              className="text-text-primary font-body-large px-3 py-6 ml-5 focus:outline-none focus:ring-0 border-0"
            />
          </InputGroup>
        </div>
      </MultiStep>
    );
  }

  // Step 4: OTP Verification
  if (currentStep === 4) {
    const isNextDisabled = formData.verificationCode.length !== 6;

    return (
      <MultiStep
        isLoading={verifyLoading}
        stepNumber={4}
        totalSteps={4}
        title="Verify Your Phone"
        subtitle={`Enter the code sent to ${formData.countryCode} ${formData.phone}`}
        isNextDisabled={isNextDisabled}
        nextButtonText={tActions("submit")}
        showBackButton={true}
        showSkipButton={false}
        onNext={handleVerifyOtp}
        onBack={prevStep}
      >
        <div className="w-full">
          <InputOTP
            maxLength={6}
            value={formData.verificationCode}
            onChange={(value) => updateFormData({ verificationCode: value.replace(/\D/g, "") })}
            pattern="[0-9]*"
            inputMode="numeric"
            className="w-full"
          >
            <InputOTPGroup className="w-full gap-2 text-text-primary font-body-large focus:outline-none focus:ring-0 border-0 bg-surface-subtle">
              <InputOTPSlot index={0} className="flex-1 h-12 text-lg rounded-md" />
              <InputOTPSlot index={1} className="flex-1 h-12 text-lg rounded-md" />
              <InputOTPSlot index={2} className="flex-1 h-12 text-lg rounded-md" />
              <InputOTPSlot index={3} className="flex-1 h-12 text-lg rounded-md" />
              <InputOTPSlot index={4} className="flex-1 h-12 text-lg rounded-md" />
              <InputOTPSlot index={5} className="flex-1 h-12 text-lg rounded-md" />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </MultiStep>
    );
  }

  return null;
}