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
        <div className=''> {/* 32px equivalent */}
            <div className='lg:space-y-[2rem]'> {/* 32px equivalent */}

                <div className='lg:h-[2.5rem]'> {/* 40px equivalent */}
                    <HeadingMedium>
                        {t("greetings.signup")}
                    </HeadingMedium>
                </div>

                <div className='lg:h-[28.25rem] space-y-[1.5rem]'> {/* 452px, 24px equivalent */}

                    <div className='lg:space-y-[1rem]'> {/* 16px equivalent */}
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
                    
                    <p className="lg:h-[3rem] text-text-primary text-sm"> {/* 48px equivalent */}
                        {t("policies.agreement")}{' '}
                        <a href="#" className="text-text-brand hover:underline">
                            {t("policies.privacyPolicy")}
                        </a>{' '}
                        {t("policies.and")}{' '}
                        <a href="#" className="text-text-brand hover:underline">
                            {t("policies.termsOfService")}
                        </a>
                    </p>
                    
                    <div className='lg:h-[3.75rem] lg:flex lg:justify-end'> {/* 60px equivalent */}
                        <Button onClick={handleSubmit} variant="outline" className="px-8 h-full bg-surface-brand hover:bg-surface-brand-light text-white rounded-full">
                            {a("continue")}
                        </Button>
                    </div>
                </div>

                <div className='lg:h-[1.5rem]'> {/* 24px equivalent */}
                    <div className="flex items-center gap-[1rem]"> {/* 16px equivalent */}
                        <div className="flex-1 border-t border-border-disabled"></div>
                        <span className="text-sm">{t("socialAuth.divider")}</span>
                        <div className="flex-1 border-t border-border-disabled"></div>
                    </div>
                </div>
                
                <div className='lg:max-h-[3rem]'> {/* 48px equivalent */}
                    <SignInProvider />
                </div>

                <div className='lg:h-[3.75rem] mx-auto flex items-center justify-center gap-[0.5rem]'> {/* 60px, 8px equivalent */}
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