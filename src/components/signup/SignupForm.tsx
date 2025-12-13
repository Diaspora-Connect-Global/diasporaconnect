/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { PasswordInput, TextInput } from '../custom/input';
import SignInProvider from '../home/SignInProvider';
import { BodyMedium, HeadingMedium, LabelLarge } from '../utils';

import { 
  CHECK_EMAIL_AVAILABILITY, 
  CheckEmailAvailabilityResponse,
  REGISTER_USER,
  RegisterUserResponse 
} from '@/services/gql/authentication';
import { useApolloClient ,useMutation} from '@apollo/client/react';
import { toast } from 'sonner';
import { ButtonType2 } from '../custom/button';

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const t = useTranslations('authentication');
  const a = useTranslations('actions');
  const client = useApolloClient();
  const router = useRouter();

  // GraphQL mutation for user registration
  const [registerUser, { loading: registerLoading }] = useMutation<RegisterUserResponse>(
    REGISTER_USER,
    {
      onCompleted: (data) => {
        if (data?.registerUser.success) {
          // Store email and registration token in sessionStorage
          sessionStorage.setItem('registrationEmail', email);
          sessionStorage.setItem('registrationToken', data.registerUser.registrationToken);
          sessionStorage.setItem('accountFormStep', '1');
          
          toast.success(t('form.signup.success'));
          router.push('/complete-account');
        }
      },
      onError: (error) => {
        toast.error(error.message || t('form.signup.failed'));
      }
    }
  );

  /**
   * Validates email format
   */
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /**
   * Validates password strength
   * Requirements: min 8 chars, uppercase, lowercase, number, special char
   */
  const isValidPassword = (password: string): boolean => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  };

  /**
   * Handles form submission and email availability check
   */
  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isChecking || registerLoading) return;

    // Validate email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error(t('form.email.label') + ' is required');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      toast.error(t('form.email.label') + ' is invalid');
      return;
    }

    // Validate password
    if (!password) {
      toast.error(t('form.createPassword.label') + ' is required');
      return;
    }
    if (!isValidPassword(password)) {
      toast.error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      toast.error(t('form.confirmPassword.mismatch'));
      return;
    }

    setIsChecking(true);

    try {
      // Check email availability
      const { data } = await client.query<CheckEmailAvailabilityResponse>({
        query: CHECK_EMAIL_AVAILABILITY,
        variables: { email: trimmedEmail },
        fetchPolicy: 'network-only', // Always check with server
      });

      if (data?.isEmailAvailable === false) {
        toast.error(t('form.email.exists'));
        setIsChecking(false);
        return;
      }

      // Email is available, proceed to store credentials and navigate
      // The actual registration will happen after completing all profile steps
      sessionStorage.setItem('signupEmail', trimmedEmail);
      sessionStorage.setItem('signupPassword', password);
      
      toast.success('Email verified! Complete your profile to continue.');
      router.push('/complete-account');

    } catch (err: any) {
      toast.error(err.message || t('form.email.checkFailed'));
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Handles OAuth provider click
   * Redirects to backend OAuth endpoints
   */
  const handleProviderClick = (provider: 'google' | 'facebook' | 'twitter') => {
    const endpoints = {
      google: 'https://api.diasporaconnectglobal.com/auth/oauth/google/start',
      facebook: 'https://api.diasporaconnectglobal.com/auth/oauth/facebook/start',
      twitter: 'https://api.diasporaconnectglobal.com/auth/oauth/twitter/start'
    };
    
    // Store current path for redirect after OAuth
    sessionStorage.setItem('oauthRedirectPath', '/complete-account');
    
    // Redirect to OAuth provider
    window.location.href = endpoints[provider];
  };

  return (
    <div className="lg:h-[100dvh]">
      <div className="lg:h-[2.5rem]">
        <HeadingMedium>{t("greetings.signup")}</HeadingMedium>
      </div>

      <div className="">
        <div className="lg:space-y-[1rem]">
          <TextInput
            value={email}
            onChange={setEmail}
            type="email"
            placeholder={t("form.email.placeholder")}
            id="email"
            // disabled={isChecking || registerLoading}
          />

          <PasswordInput
            id="password"
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            placeholder={t("form.createPassword.placeholder")}
            label={t("form.createPassword.label")}
            // disabled={isChecking || registerLoading}
          />

          <PasswordInput
            id="confirmPassword"
            password={confirmPassword}
            setPassword={setConfirmPassword}
            showPassword={showConfirmPassword}
            setShowPassword={setShowConfirmPassword}
            placeholder={t("form.confirmPassword.placeholder")}
            label={t("form.confirmPassword.label")}
            // disabled={isChecking || registerLoading}
          />
        </div>

        <p className="lg:h-[3rem] text-text-primary text-sm">
          {t("policies.agreement")}{' '}
          <a href="#" className="text-text-brand hover:underline">
            {t("policies.privacyPolicy")}
          </a>{' '}
          {t("policies.and")}{' '}
          <a href="#" className="text-text-brand hover:underline">
            {t("policies.termsOfService")}
          </a>
        </p>

        <div className="lg:h-[3.75rem] lg:flex lg:justify-end mb-2">
          <ButtonType2
            onClick={handleSubmit}
            disabled={isChecking || registerLoading}
            className="px-8 py-4 w-full lg:w-fit"
          >
            {isChecking || registerLoading ? 'Processing...' : a("continue")}
          </ButtonType2>
        </div>
      </div>

      <div className="lg:h-[1.5rem] mb-2">
        <div className="flex items-center gap-[1rem]">
          <div className="flex-1 border-t border-border-disabled"></div>
          <span className="text-sm">{t("socialAuth.divider")}</span>
          <div className="flex-1 border-t border-border-disabled"></div>
        </div>
      </div>

      <div className="lg:max-h-[3rem] mb-2">
        <SignInProvider onProviderClick={handleProviderClick} />
      </div>

      <div className="lg:h-[3.75rem] mx-auto flex items-center justify-center gap-[0.5rem]">
        <BodyMedium>{t("accountSwitch.existingAccount.prompt")}</BodyMedium>
        <Link href="/signin" className="text-text-brand font-medium hover:underline">
          <LabelLarge>{t("accountSwitch.existingAccount.action")}</LabelLarge>
        </Link>
      </div>
    </div>
  );
}