/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter } from '@/i18n/navigation';
import { getAndClearRedirectUrl } from '@/lib/authRedirect';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LOGIN_USER, LoginInput, LoginResponse } from '@/services/gql/signin';
import { generateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { useAuthStore } from '@/store/useAuthStore';

import { TextInput, PasswordInput } from '../custom/input';
import SignInProvider from '../home/SignInProvider';
import { ButtonType2 } from '../custom/button';
import { FormBanner } from '../custom/FormBanner';
import { Link } from '@/i18n/navigation';
import { HeadingMedium, BodyMedium, LabelLarge } from '../utils';
import { useUserStore } from '@/store/useUserStore';
import {
  isValidEmailFormat,
  shouldShowEmailFormatError,
} from '@/lib/emailValidation';
import { mapAuthError, isNetworkError } from '@/lib/authErrorMessages';

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
    const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
    const [formError, setFormError] = useState('');

    const t = useTranslations('authentication');
    const a = useTranslations('actions');
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loginUser, { loading }] = useMutation<LoginResponse>(LOGIN_USER);

    // Show OAuth callback error (e.g. access_denied, oauth_failed) and clear from URL
    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            setFormError(decodeURIComponent(error));
            router.replace('/signin');
        }
    }, [searchParams, router]);

    // Zustand auth store actions
    const setTokens = useAuthStore((s) => s.setTokens);
    const setUser = useUserStore((s) => s.setUser);
    const setDeviceMetadata = useAuthStore((s) => s.setDeviceMetadata);
    const setRememberMeStore = useUserStore((s) => s.setRememberMe);

    const isAllowedUserRole = (role?: string | null) => {
        const normalized = (role || '').trim().toLowerCase();
        return normalized === 'local' || normalized === 'diaspora';
    };

    /* ============ Validation ============ */
    const validateEmail = (email: string): string | undefined => {
        if (!email.trim()) return t('validation.email.required');
        if (!isValidEmailFormat(email)) return t('validation.email.invalid');
        return undefined;
    };

    const validatePassword = (password: string): string | undefined => {
        if (!password) return t('validation.password.required');
        if (password.length < 8) return t('validation.password.minLength');
        return undefined;
    };

    const validateTwoFactorCode = (code: string): string | undefined => {
        if (!code.trim()) return t('validation.twoFactor.required');
        if (!/^\d{6}$/.test(code)) return t('validation.twoFactor.invalid');
        return undefined;
    };

    const validateForm = (): { isValid: boolean; errors: ValidationErrors } => {
        const errors: ValidationErrors = {};
        const emailError = validateEmail(email);
        if (emailError) errors.email = emailError;
        const passwordError = validatePassword(password);
        if (passwordError) errors.password = passwordError;
        if (showTwoFactor) {
            const twoFactorError = validateTwoFactorCode(twoFactorCode);
            if (twoFactorError) errors.twoFactorCode = twoFactorError;
        }
        return { isValid: Object.keys(errors).length === 0, errors };
    };

    /* ============ Field error helpers ============ */
    const clearFieldError = (field: keyof ValidationErrors) => {
        setFormError('');
        setFieldErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    /* ============ Submit ============ */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        const { isValid, errors } = validateForm();
        setFieldErrors(errors);
        if (!isValid) return;

        try {
            // Get existing fingerprint from store (already initialized by DeviceFingerprintInitializer)
            const { deviceMetadata } = useAuthStore.getState();
            const deviceId = deviceMetadata?.fingerprint || await generateDeviceFingerprint(); // Fallback only

            const input: LoginInput = {
                email: email.trim().toLowerCase(),
                password,
                deviceId,
                rememberMe,
                ...(twoFactorCode && { twoFactorCode: twoFactorCode.trim() }),
            };

            const { data } = await loginUser({ variables: { input } });

            if (data?.login.requiresTwoFactor && !showTwoFactor) {
                setShowTwoFactor(true);
                toast.success(t('twoFactor.enterCode'));
                return;
            }

            if (data?.login.success) {
                if (!isAllowedUserRole(data.login.user?.role)) {
                    setFormError('Access denied. Only local or diaspora users can sign in here.');
                    setShowTwoFactor(false);
                    setTwoFactorCode('');
                    return;
                }

                // 🔥 Zustand storage instead of authStorage
                setTokens({
                    accessToken: data.login.accessToken,
                    refreshToken: data.login.refreshToken,
                    sessionToken: data.login.sessionToken,
                    sessionId: data.login.sessionId,
                    expiresIn: data.login.expiresIn,
                });
                console.log("User data on login:", data.login.user);   
                const user = data.login.user 
                setUser({
                    ...user,
                    userId: user.id,
                    middleName: '',
                    residenceSinceYear: 0,
                    residenceSinceMonth: 0,
                    connectionCount: 0,
                    version: 0,
                    createdAt: '',
                    updatedAt: ''
                });
                setDeviceMetadata(data.login.deviceMetadata);
                setRememberMeStore(rememberMe);

                toast.success(t('login.welcomeBack', { name: data.login.user.firstName }));
                // Return them to whatever they were trying to reach, if the
                // protected layout stashed it on the way out. The stored path is
                // locale-agnostic, so this router adds the right prefix.
                router.push(getAndClearRedirectUrl() ?? '/home');
            } else {
                const errorMessage = data?.login.error || data?.login.message || t('login.failed');
                // Credential/server errors → persistent banner above the button.
                setFormError(mapAuthError(errorMessage, t));
            }
        } catch (error: any) {
            console.error('Login error:', error);
            // Network/system failures → toast; everything else → banner.
            if (isNetworkError(error)) {
                toast.error(t('login.networkError'));
            } else {
                setFormError(mapAuthError(error?.message, t));
            }
        }
    };

    const emailTrimmed = email.trim();
    const emailFormatOk = isValidEmailFormat(emailTrimmed);
    const showEmailFormatError =
        shouldShowEmailFormatError(email) && !emailFormatOk;

    return (
        <div className="space-y-4 lg:space-y-8">
            <div>
                <HeadingMedium>
                    {t("greetings.login")}
                </HeadingMedium>
            </div>

            <div className="space-y-6 lg:space-y-8">
                <div className="space-y-4">
                    <TextInput
                        value={email}
                        onChange={(v) => { setEmail(v); clearFieldError('email'); }}
                        type="email"
                        placeholder={t("form.email.placeholder")}
                        label={t("form.email.label")}
                        id="email"
                        errorMessage={
                            fieldErrors.email ||
                            (showEmailFormatError
                                ? t('validation.email.invalid')
                                : undefined)
                        }
                        success={
                            !fieldErrors.email && emailFormatOk && emailTrimmed.length > 0
                        }
                    />

                    <PasswordInput
                        id='password'
                        password={password}
                        setPassword={(v) => { setPassword(v); clearFieldError('password'); }}
                        showPassword={showPassword}
                        setShowPassword={setShowPassword}
                        placeholder={t("form.password.placeholder")}
                        label={t("form.password.label")}
                        errorMessage={fieldErrors.password}
                    />
                </div>

                <div className="space-y-4">
                    <Link href="/reset" className="text-text-brand font-medium hover:underline">
                        <p className='flex label-large'>
                            {t("forgotPassword")}
                        </p>
                    </Link>

                    <FormBanner message={formError} />

                    <ButtonType2
                        onClick={handleSubmit} 
                        disabled={loading} 
                        className="px-8 py-3 bg-surface-brand rounded-full w-full cursor-pointer"
                    >
                        <span className="flex items-center justify-center gap-2">
                            {loading ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                a("login")
                            )}
                        </span>
                    </ButtonType2>
                </div>
            </div>

            <div className="lg:py-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-border-subtle"></div>
                    <span className="text-sm">{t("socialAuth.divider")}</span>
                    <div className="flex-1 border-t border-border-subtle"></div>
                </div>
            </div>

            <div>
                <SignInProvider />
            </div>

            <div className="flex items-center justify-center text-center flex-wrap gap-2 lg:pt-4">
                <BodyMedium>
                    {t("accountSwitch.newAccount.prompt")}
                </BodyMedium>
                <Link href="/signup" className="text-text-brand font-medium hover:underline">
                    <LabelLarge>
                        {t("accountSwitch.newAccount.action")}
                    </LabelLarge>
                </Link>
            </div>
        </div>
    );
}