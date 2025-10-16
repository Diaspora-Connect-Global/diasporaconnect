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
        <div className="w-full mx-auto flex items-center justify-center">
            <div>
                <div className="space-y-4 p-6">
                    <HeadingMedium>
                        {t("greetings.signup")}
                    </HeadingMedium>
                    <div className="space-y-4">
                        <TextInput
                            value={email}
                            onChange={setEmail}
                            type="email"
                            placeholder={t("form.email.placeholder")}
                            label={t("form.email.label")}
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
                        <p className="text-text-primary text-sm">
                            {t("policies.agreement")}{' '}
                            <a href="#" className="text-text-brand hover:underline">
                                {t("policies.privacyPolicy")}
                            </a>{' '}
                            {t("policies.and")}{' '}
                            <a href="#" className="text-text-brand hover:underline">
                                {t("policies.termsOfService")}
                            </a>
                        </p>

                        <div className='flex justify-end'>
                            <Button onClick={handleSubmit} variant="outline" className="px-8 h-12 bg-surface-brand hover:bg-surface-brand-light text-white rounded-full">
                                {a("continue")}
                            </Button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 border-t border-border-disabled"></div>
                            <span className="text-sm">{t("socialAuth.divider")}</span>
                            <div className="flex-1 border-t border-border-disabled"></div>
                        </div>

                        <SignInProvider />
                        <div className='flex items-center justify-center gap-2'>
                            <BodyMedium className="text-center text-sm">
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
            </div>
        </div>
    );
}