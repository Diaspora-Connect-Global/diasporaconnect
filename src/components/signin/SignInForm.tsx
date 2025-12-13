/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { BodyMedium, HeadingMedium, LabelLarge } from '../utils';
import { PasswordInput, TextInput } from '../custom/input';
import SignInProvider from '../home/SignInProvider';
import { LOGIN_USER, LoginInput, LoginResponse } from '@/services/gql/signin';
import { toast } from 'sonner';
import { generateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { authStorage } from '@/store/CentralPersist';
import { ButtonType2 } from '../custom/button';

interface ValidationErrors {
    email?: string;
    password?: string;
    twoFactorCode?: string;
}

export default function SignInForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    
    const t = useTranslations('authentication');
    const a = useTranslations('actions');
    const router = useRouter();

    const [loginUser, { loading }] = useMutation<LoginResponse>(LOGIN_USER);

    // Validation functions
    const validateEmail = (email: string): string | undefined => {
        if (!email.trim()) {
            return t('validation.email.required');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return t('validation.email.invalid');
        }
        
        return undefined;
    };

    const validatePassword = (password: string): string | undefined => {
        if (!password) {
            return t('validation.password.required');
        }
        
        if (password.length < 8) {
            return t('validation.password.minLength');
        }
        
        return undefined;
    };

    const validateTwoFactorCode = (code: string): string | undefined => {
        if (!code.trim()) {
            return t('validation.twoFactor.required');
        }
        
        if (!/^\d{6}$/.test(code)) {
            return t('validation.twoFactor.invalid');
        }
        
        return undefined;
    };

    const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
        const errors: ValidationErrors = {};
        
        const emailError = validateEmail(email);
        if (emailError) {
            errors.email = emailError;
        }
        
        const passwordError = validatePassword(password);
        if (passwordError) {
            errors.password = passwordError;
        }
        
        if (showTwoFactor) {
            const twoFactorError = validateTwoFactorCode(twoFactorCode);
            if (twoFactorError) {
                errors.twoFactorCode = twoFactorError;
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        const { isValid, errors } = validateForm();
        
        if (!isValid) {
            // Show validation errors
            if (errors.email) {
                toast.error(errors.email);
                return;
            }
            if (errors.password) {
                toast.error(errors.password);
                return;
            }
            if (errors.twoFactorCode) {
                toast.error(errors.twoFactorCode);
                return;
            }
            toast.error(t('validation.formError'));
            return;
        }

        try {
            // Generate device fingerprint
            const deviceId = await generateDeviceFingerprint();

            // Prepare login input
            const input: LoginInput = {
                email: email.trim().toLowerCase(),
                password,
                deviceId,
                rememberMe,
                ...(twoFactorCode && { twoFactorCode: twoFactorCode.trim() })
            };

            // Execute login mutation
            const { data } = await loginUser({
                variables: { input }
            });

            if (data?.login.requiresTwoFactor && !showTwoFactor) {
                // Show 2FA input
                setShowTwoFactor(true);
                toast.success(t('twoFactor.enterCode'));
                return;
            }

            if (data?.login.success) {
                // Store authentication data using centralized storage
                authStorage.setTokens({
                    accessToken: data.login.accessToken,
                    refreshToken: data.login.refreshToken,
                    sessionToken: data.login.sessionToken,
                    sessionId: data.login.sessionId,
                    expiresIn: data.login.expiresIn,
                });

                // Store user data
                authStorage.setUser(data.login.user);

                // Store device metadata
                authStorage.setDeviceMetadata(data.login.deviceMetadata);

                // Set remember me preference
                authStorage.setRememberMe(rememberMe);

                // Show success message
                toast.success(t('login.welcomeBack', { name: data.login.user.firstName }));

                // Navigate to dashboard
                router.push('/');
            } else if (data?.login.error) {
                // Show error message
                toast.error(data.login.error || t('login.failed'));
            }
        } catch (error: any) {
            console.error('Login error:', error);
            
            // Handle specific error types
            const errorMessage = error.message?.toLowerCase() || '';
            
            if (errorMessage.includes('invalid credentials') || errorMessage.includes('unauthorized')) {
                toast.error(t('login.invalidCredentials'));
            } else if (errorMessage.includes('account locked') || errorMessage.includes('locked')) {
                toast.error(t('login.accountLocked'));
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                toast.error(t('login.networkError'));
            } else if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
                toast.error(t('login.tooManyAttempts'));
            } else {
                toast.error(t('login.genericError'));
            }
        }
    };

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

                    <div className="lg:h-[3.75rem] lg:flex flex-col lg:justify-between  space-y-4"> {/* 60px equivalent */}
                        <Link href="/reset" className="text-text-brand font-medium hover:underline">
                            <p className='flex label-large'>
                                {t("forgotPassword")}
                            </p>
                        </Link>
                        <ButtonType2 onClick={handleSubmit}  className="px-8 py-3 h-full bg-surface-brand rounded-full w-full cursor-pointer">
                            {a("login")}
                        </ButtonType2>
                    </div>
                </div>
                
                <div className='lg:max-h-[1.5rem] my-4'> {/* 24px equivalent */}
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