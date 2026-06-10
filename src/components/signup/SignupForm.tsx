/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { PasswordInput, TextInput } from '../custom/input';
import { FormBanner } from '../custom/FormBanner';
import SignInProvider from '../home/SignInProvider';
import { BodyMedium, HeadingMedium, LabelLarge } from '../utils';

import { 
  CHECK_EMAIL_AVAILABILITY, 
  CheckEmailAvailabilityResponse,
  REGISTER_USER,
  RegisterUserResponse 
} from '@/services/gql/authentication';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { ButtonType2 } from '../custom/button';
import { generateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { useAuthStore } from '@/store/useAuthStore';
import {
  isValidEmailFormat,
  shouldShowEmailFormatError,
} from '@/lib/emailValidation';
import { isNetworkError } from '@/lib/authErrorMessages';

interface SignupFieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const PasswordRequirement: React.FC<{ met: boolean; label: string }> = ({ met, label }) => (
  <li className={`flex items-center gap-2 text-sm ${met ? 'text-success' : 'text-text-secondary'}`}>
    {met ? <Check size={14} className="shrink-0" /> : <X size={14} className="shrink-0" />}
    <span>{label}</span>
  </li>
);

export default function SignUpForm() {
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [formError, setFormError] = useState('');

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
          router.push('/onboarding');
        }
      },
      onError: (error) => {
        if (isNetworkError(error)) {
          toast.error(t('login.networkError'));
        } else {
          setFormError(error.message || t('form.signup.failed'));
        }
      }
    }
  );

  /**
   * Per-criterion password strength checks. Used both for the live checklist
   * under the field and to gate submission.
   */
  const passwordChecks = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isValidPassword = (pwd: string): boolean => {
    return (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    );
  };

  /**
   * Handles form submission and email availability check
   */
  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isChecking || registerLoading) return;

    setFormError('');

    // Validate all fields up front and surface errors inline.
    const trimmedEmail = email.trim();
    const errors: SignupFieldErrors = {};

    if (!trimmedEmail) {
      errors.email = t('validation.email.required');
    } else if (!isValidEmailFormat(trimmedEmail)) {
      errors.email = t('validation.email.invalid');
    }

    if (!password) {
      errors.password = t('validation.password.required');
    } else if (!isValidPassword(password)) {
      errors.password = t('validation.password.requirements.title');
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = t('form.confirmPassword.mismatch');
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsChecking(true);

    try {
      // Check email availability
      const { data } = await client.query<CheckEmailAvailabilityResponse>({
        query: CHECK_EMAIL_AVAILABILITY,
        variables: { email: trimmedEmail },
        fetchPolicy: 'network-only', // Always check with server
      });

      if (data?.isEmailAvailable === false) {
        setFieldErrors({ email: t('form.email.exists') });
        setIsChecking(false);
        return;
      }

      // ✅ Generate and store device fingerprint
      const { deviceMetadata, setDeviceMetadata } = useAuthStore.getState();
      let deviceId = deviceMetadata?.fingerprint;
      
      if (!deviceId) {
        console.log('[SignUp] Generating new device fingerprint');
        deviceId = await generateDeviceFingerprint();
        
        // Store in both sessionStorage and Zustand
        sessionStorage.setItem('deviceFingerprint', deviceId);
        setDeviceMetadata({
          fingerprint: deviceId,
          deviceId: deviceId,
          ipAddress: '',
          userAgent: navigator.userAgent
        });
      } else {
        console.log('[SignUp] Using existing device fingerprint');
      }

      // Email is available, proceed to store credentials and navigate
      // The actual registration will happen after completing all profile steps
      sessionStorage.setItem('signupEmail', trimmedEmail);
      sessionStorage.setItem('signupPassword', password);
      sessionStorage.setItem('signupDeviceId', deviceId); // ✅ Store for later use
      
      toast.success('Email verified! Complete your profile to continue.');
      router.push('/onboarding');

    } catch (err: any) {
      console.error('[SignUp] Error:', err);
      if (isNetworkError(err)) {
        toast.error(t('login.networkError'));
      } else {
        setFormError(err.message || t('form.email.checkFailed'));
      }
    } finally {
      setIsChecking(false);
    }
  };

  const emailTrimmed = email.trim();
  const emailOk = isValidEmailFormat(emailTrimmed);
  const showEmailError =
    shouldShowEmailFormatError(email) && !emailOk;
  const passwordOk = password.length > 0 && isValidPassword(password);
  const confirmOk =
    confirmPassword.length > 0 && password === confirmPassword;
  const canContinue =
    emailOk && passwordOk && confirmOk && !isChecking && !registerLoading;

  return (
    <div className="space-y-4 lg:space-y-8">
      <div>
        <HeadingMedium>{t("greetings.signup")}</HeadingMedium>
      </div>

      <div className="space-y-4 lg:space-y-6">
        <div className="space-y-4">
          <TextInput
            value={email}
            onChange={(v) => { setEmail(v); setFormError(''); setFieldErrors((p) => ({ ...p, email: undefined })); }}
            type="email"
            placeholder={t("form.email.placeholder")}
            label={t('form.email.label')}
            id="email"
            errorMessage={
              fieldErrors.email || (showEmailError ? t('validation.email.invalid') : undefined)
            }
            success={!fieldErrors.email && emailOk && emailTrimmed.length > 0}
          />

          <div className="space-y-2">
            <PasswordInput
              id="password"
              password={password}
              setPassword={(v) => { setPassword(v); setFormError(''); setFieldErrors((p) => ({ ...p, password: undefined })); }}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              placeholder={t("form.createPassword.placeholder")}
              label={t("form.createPassword.label")}
              errorMessage={fieldErrors.password}
              success={passwordOk}
            />
            {password.length > 0 && !passwordOk && (
              <ul className="space-y-1 pt-1">
                <PasswordRequirement met={passwordChecks.minLength} label={t('validation.password.requirements.minLength')} />
                <PasswordRequirement met={passwordChecks.uppercase} label={t('validation.password.requirements.uppercase')} />
                <PasswordRequirement met={passwordChecks.lowercase} label={t('validation.password.requirements.lowercase')} />
                <PasswordRequirement met={passwordChecks.number} label={t('validation.password.requirements.number')} />
                <PasswordRequirement met={passwordChecks.special} label={t('validation.password.requirements.special')} />
              </ul>
            )}
          </div>

          <PasswordInput
            id="confirmPassword"
            password={confirmPassword}
            setPassword={(v) => { setConfirmPassword(v); setFormError(''); setFieldErrors((p) => ({ ...p, confirmPassword: undefined })); }}
            showPassword={showConfirmPassword}
            setShowPassword={setShowConfirmPassword}
            placeholder={t("form.confirmPassword.placeholder")}
            label={t("form.confirmPassword.label")}
            errorMessage={fieldErrors.confirmPassword}
            success={confirmOk}
          />
        </div>

        <p className="text-text-primary text-sm lg:py-2">
          {t("policies.agreement")}{' '}
          <a href="#" className="text-text-brand hover:underline">
            {t("policies.privacyPolicy")}
          </a>{' '}
          {t("policies.and")}{' '}
          <a href="#" className="text-text-brand hover:underline">
            {t("policies.termsOfService")}
          </a>
        </p>

        <FormBanner message={formError} />

        <div className="flex justify-end">
          <ButtonType2
            onClick={handleSubmit}
            disabled={!canContinue}
            className="px-8 py-4 w-full lg:w-fit"
          >
            {isChecking || registerLoading ? tCommon("processing") : a("continue")}
          </ButtonType2>
        </div>
      </div>

      <div className="lg:py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-border-disabled"></div>
          <span className="text-sm">{t("socialAuth.divider")}</span>
          <div className="flex-1 border-t border-border-disabled"></div>
        </div>
      </div>

      <div>
        {/* Same OAuth start URLs as sign-in (api.diaspoplug.net); callback → /callback then onboarding for new users */}
        <SignInProvider />
      </div>

      <div className="flex items-center justify-center gap-2 lg:pt-4">
        <BodyMedium>{t("accountSwitch.existingAccount.prompt")}</BodyMedium>
        <Link href="/signin" className="text-text-brand font-medium hover:underline">
          <LabelLarge>{t("accountSwitch.existingAccount.action")}</LabelLarge>
        </Link>
      </div>
    </div>
  );
}