"use client";
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useRouter  } from 'next/navigation';
import React, { useState } from 'react';
import { PasswordInput, TextInput } from '../custom/input';
import SignInProvider from '../home/SignInProvider';
import { BodyMedium, HeadingMedium, LabelLarge } from '../utils';

import { CHECK_EMAIL_AVAILABILITY, CheckEmailAvailabilityResponse } from '@/services/gql/authentication';
import { useApolloClient } from '@apollo/client/react';
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
  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isChecking) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error(t('form.email.label') + ' is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error(t('form.email.label') + ' is invalid');
      return;
    }

    setIsChecking(true);

    try {
      // const { data } = await client.query<CheckEmailAvailabilityResponse>({
      //   query: CHECK_EMAIL_AVAILABILITY,
      //   variables: { email: trimmedEmail },
      // });

      // if (data?.checkEmailAvailability === false) {
      //   toast.error(t('form.email.exists'));
      //   return;
      // }

      // if (password !== confirmPassword) {
      //   toast.error(t('form.confirmPassword.mismatch'));
      //   return;
      // }

      toast.success(t('form.signup.success'));
router.push('/complete-account');  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || t('form.email.checkFailed'));
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="">
      <div className="lg:space-y-[2rem]">

        <div className="lg:h-[2.5rem]">
          <HeadingMedium>{t("greetings.signup")}</HeadingMedium>
        </div>

        <div className="lg:h-[28.25rem] space-y-[1.5rem]">

          <div className="lg:space-y-[1rem]">
            <TextInput
              value={email}
              onChange={setEmail}
              type="email"
              placeholder={t("form.email.placeholder")}
              id="email"
            />

            <PasswordInput
              id="password"
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              placeholder={t("form.createPassword.placeholder")}
              label={t("form.createPassword.label")}
            />

            <PasswordInput
              id="confirmPassword"
              password={confirmPassword}
              setPassword={setConfirmPassword}
              showPassword={showConfirmPassword}
              setShowPassword={setShowConfirmPassword}
              placeholder={t("form.confirmPassword.placeholder")}
              label={t("form.confirmPassword.label")}
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

          <div className="lg:h-[3.75rem] lg:flex lg:justify-end">
            <ButtonType2
              onClick={handleSubmit}
              disabled={isChecking}
              className="px-8 py-4"
            >
              {isChecking ? t('form.email.checkFailed') : a("continue")}
            </ButtonType2>
          </div>
        </div>

        <div className="lg:h-[1.5rem]">
          <div className="flex items-center gap-[1rem]">
            <div className="flex-1 border-t border-border-disabled"></div>
            <span className="text-sm">{t("socialAuth.divider")}</span>
            <div className="flex-1 border-t border-border-disabled"></div>
          </div>
        </div>

        <div className="lg:max-h-[3rem]">
          <SignInProvider />
        </div>

        <div className="lg:h-[3.75rem] mx-auto flex items-center justify-center gap-[0.5rem]">
          <BodyMedium>{t("accountSwitch.existingAccount.prompt")}</BodyMedium>
          <Link href="/signin" className="text-text-brand font-medium hover:underline">
            <LabelLarge>{t("accountSwitch.existingAccount.action")}</LabelLarge>
          </Link>
        </div>
      </div>
    </div>
  );
}