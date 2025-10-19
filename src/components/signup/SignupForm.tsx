"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { BodyMedium, HeadingMedium, LabelLarge } from '../utils';
import { PasswordInput, TextInput } from '../custom/input';
import { redirect } from 'next/navigation';
import SignInProvider from '../home/SignInProvider';

export default function SignUpForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const t = useTranslations('authentication');
    const a = useTranslations('actions');

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        e.preventDefault()
        // Handle form submission logic here
        console.log('Email:', email);
        console.log('Password:', password);

        //navigate to complete account page
        redirect('/complete-account');
    }

    return (
        <div className='lg:pb-[calc(32/922*100vh)]'>
            <div className='lg:space-y-[calc(32/922*100vh)]'>

                <div className=' lg:h-[calc(40/922*100vh)] '>
                    <HeadingMedium>
                        {t("greetings.signup")}
                    </HeadingMedium>
                </div>

                <div className='lg:h-[calc(452/922*100vh)]  space-y-[calc(24/922*100vh)]'>

                    <div className='lg:space-y-[calc(16/922*100vh)]'>
                        <TextInput
                            value={email}
                            onChange={setEmail}
                            type="email"
                            placeholder={t("form.email.placeholder")}
                            // label={t("form.email.label")}
                            id="email"
                        />

                        <PasswordInput
                            id='password'
                            password={password}
                            setPassword={setPassword}
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                            placeholder={t("form.createPassword.placeholder")}
                            label={t("form.createPassword.label")}
                        />

                        <PasswordInput
                            id='confirmPassword'
                            password={confirmPassword}
                            setPassword={setConfirmPassword}
                            showPassword={showConfirmPassword}
                            setShowPassword={setShowConfirmPassword}
                            placeholder={t("form.confirmPassword.placeholder")}
                            label={t("form.confirmPassword.label")}
                        />
                    </div>
                    <p className="lg:h-[calc(48/922*100vh)] text-text-primary text-sm">
                        {t("policies.agreement")}{' '}
                        <a href="#" className="text-text-brand hover:underline">
                            {t("policies.privacyPolicy")}
                        </a>{' '}
                        {t("policies.and")}{' '}
                        <a href="#" className="text-text-brand hover:underline">
                            {t("policies.termsOfService")}
                        </a>
                    </p>
                    <div className='lg:h-[calc(60/922*100vh)] lg:flex lg:justify-end'>
                        <Button onClick={handleSubmit} variant="outline" className="px-8 h-full bg-surface-brand hover:bg-surface-brand-light text-white rounded-full">
                            {a("continue")}
                        </Button>
                    </div>
                </div>


                <div className='lg:h-[calc(24/922*100vh)]'>

                    <div className="flex items-center gap-4">
                        <div className="flex-1 border-t border-border-disabled"></div>
                        <span className="text-sm">{t("socialAuth.divider")}</span>
                        <div className="flex-1 border-t border-border-disabled"></div>
                    </div>

                </div>
                <div className='lg:max-h-[calc(48/922*100vh)]'>
                    <SignInProvider />
                </div>


                <div className='lg:h-[calc(60/922*100vh)] mx-auto flex items-center justify-center '>
                    <BodyMedium className="">
                        {t("accountSwitch.existingAccount.prompt")}
                    </BodyMedium>
                    <Link href="/signin" className="text-text-brand font-medium hover:underline">
                        <LabelLarge>
                            {t("accountSwitch.existingAccount.action")}
                        </LabelLarge>
                    </Link>

                </div>
            </div>
        </div>
    );
}