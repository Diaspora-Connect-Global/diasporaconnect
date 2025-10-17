"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { BodyMedium, HeadingMedium, LabelLarge } from '../utils';
import { PasswordInput, TextInput } from '../custom/input';
import { redirect } from 'next/navigation';
import SignInProvider from '../home/SignInProvider';


export default function SignInForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
        <div className="w-full flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="space-y-6">
                    <HeadingMedium>
                        {t("greetings.login")}
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
                            placeholder={t("form.password.placeholder")}
                            label={t("form.password.label")}
                        />

                        <p className="text-sm flex justify-between">
                            <Link href="#" className="text-text-brand font-medium hover:underline">
                                <LabelLarge>
                                    {t("forgotPassword")}
                                </LabelLarge>
                            </Link>
                            <Button onClick={handleSubmit} variant="outline" className="px-8 h-12 bg-surface-brand hover:bg-blue-700 text-white rounded-full">
                                {a("login")}
                            </Button>
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 border-t border-gray-300"></div>
                            <span className="text-sm">{t("socialAuth.divider")}</span>
                            <div className="flex-1 border-t border-gray-300"></div>
                        </div>

                        <SignInProvider/>
                        
                        <div className='flex items-center justify-center gap-2'>
                            <BodyMedium className="text-center text-sm">
                                {t("accountSwitch.newAccount.prompt")}
                            </BodyMedium>
                            <Link href="/signup" className="text-text-brand font-medium hover:underline">
                                <LabelLarge>
                                    {t("accountSwitch.newAccount.action")}
                                </LabelLarge>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}