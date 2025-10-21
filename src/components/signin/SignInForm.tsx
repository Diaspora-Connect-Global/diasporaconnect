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
        <div className=''> {/* 80px equivalent */}
            <div className="lg:space-y-[2rem]"> {/* 32px equivalent */}

                <div className='lg:h-[2.5rem]'> {/* 40px equivalent */}
                    <HeadingMedium>
                        {t("greetings.login")}
                    </HeadingMedium>
                </div>

                <div className='lg:h-[17.25rem] space-y-[1.5rem]'> {/* 276px, 24px equivalent */}

                    <div className='lg:space-y-[1rem]'> {/* 16px equivalent */}
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
                    </div>

                    <div className="lg:h-[3.75rem] lg:flex lg:justify-between"> {/* 60px equivalent */}
                        <Link href="/reset" className="text-text-brand font-medium hover:underline">
                            <LabelLarge>
                                {t("forgotPassword")}
                            </LabelLarge>
                        </Link>
                        <Button onClick={handleSubmit} variant="outline" className="px-8 h-full bg-surface-brand text-white rounded-full cursor-pointer">
                            {a("login")}
                        </Button>
                    </div>
                </div>
                
                <div className='lg:max-h-[1.5rem]'> {/* 24px equivalent */}
                    <div className="flex items-center gap-[1rem]"> {/* 16px equivalent */}
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="text-sm">{t("socialAuth.divider")}</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                    </div>
                </div>

                <div className='lg:max-h-[3rem]'> {/* 48px equivalent */}
                    <SignInProvider />
                </div>

                <div className='lg:max-h-[3.75rem] mx-auto flex items-center justify-center gap-[0.5rem]'> {/* 60px, 8px equivalent */}
                    <BodyMedium className="">
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
    );
}