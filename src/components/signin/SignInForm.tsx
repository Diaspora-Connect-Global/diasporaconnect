/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter } from '@/i18n/navigation';
import { getAndClearRedirectUrl } from '@/lib/authRedirect';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LOGIN_USER, LoginInput, LoginResponse } from '@/services/gql/signin';
import { COMPLETE_TWO_FACTOR_LOGIN, RESEND_TWO_FACTOR_LOGIN_CODE } from '@/services/gql/twoFactor';
import type {
    CompleteTwoFactorLoginData,
    ResendTwoFactorLoginCodeData,
} from '@/services/gql/types/twoFactor';
import { twoFactorErrorKey, endsTwoFactorSignIn } from '@/lib/twoFactorErrors';
import TwoFactorCodeField from './TwoFactorCodeField';
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

/**
 * A sign-in waiting for its emailed code. `token` is the opaque pending-2FA
 * token (from `login`, or from the Google/Facebook callback); it lives only in
 * component state and is dropped as soon as the step ends.
 */
interface PendingTwoFactor {
    token: string;
    rememberMe: boolean;
}

const isAllowedUserRole = (role?: string | null) => {
    const normalized = (role || '').trim().toLowerCase();
    return normalized === 'local' || normalized === 'diaspora';
};

/** Seconds between "send a new code" requests (matches the server cooldown). */
const RESEND_COOLDOWN_SECONDS = 60;
/** The two-factor mutations show their own translated messages. */
const SILENT = { context: { silentErrors: true } } as const;

export default function SignInForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [pendingTwoFactor, setPendingTwoFactor] = useState<PendingTwoFactor | null>(null);
    const [codeError, setCodeError] = useState('');
    const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
    const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
    const [formError, setFormError] = useState('');
    const oauthHandoffRead = useRef(false);

    const t = useTranslations('authentication');
    const te = useTranslations('authentication.twoFactor.errors');
    const a = useTranslations('actions');
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loginUser, { loading }] = useMutation<LoginResponse>(LOGIN_USER);
    const [completeTwoFactorLogin, { loading: verifyingCode }] =
        useMutation<CompleteTwoFactorLoginData>(COMPLETE_TWO_FACTOR_LOGIN, SILENT);
    const [resendTwoFactorLoginCode, { loading: resendingCode }] =
        useMutation<ResendTwoFactorLoginCodeData>(RESEND_TWO_FACTOR_LOGIN_CODE, SILENT);

    // Show OAuth callback error (e.g. access_denied, oauth_failed) and clear from URL
    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            setFormError(decodeURIComponent(error));
            router.replace('/signin');
        }
    }, [searchParams, router]);

    // Google/Facebook sign-in for a 2FA account: the callback page stashed the
    // pending token in sessionStorage and sent us here with ?oauth2fa=1. Read
    // it once (the ref survives React StrictMode's double effect) and remove it
    // straight away — from here on it lives only in memory.
    useEffect(() => {
        if (searchParams.get('oauth2fa') !== '1' || oauthHandoffRead.current) return;
        oauthHandoffRead.current = true;
        let token: string | null = null;
        try {
            token = sessionStorage.getItem('twoFaSessionToken');
            sessionStorage.removeItem('twoFaSessionToken');
        } catch {
            token = null;
        }
        if (token) {
            setPendingTwoFactor({ token, rememberMe: false });
            setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
        } else {
            setFormError(te('sessionExpired'));
        }
    }, [searchParams, te]);

    // Resend countdown.
    useEffect(() => {
        if (resendSecondsLeft <= 0) return;
        const timer = setTimeout(() => setResendSecondsLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearTimeout(timer);
    }, [resendSecondsLeft]);

    // Zustand auth store actions
    const setTokens = useAuthStore((s) => s.setTokens);
    const setUser = useUserStore((s) => s.setUser);
    const setDeviceMetadata = useAuthStore((s) => s.setDeviceMetadata);
    const setRememberMeStore = useUserStore((s) => s.setRememberMe);

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

    /* ============ Signed in (password, or after the 2FA code) ============ */
    const completeSignIn = useCallback(
        (payload: LoginResponse['login'], rememberMeValue: boolean): boolean => {
            if (!isAllowedUserRole(payload.user?.role)) {
                setFormError('Access denied. Only local or diaspora users can sign in here.');
                return false;
            }

            // 🔥 Zustand storage instead of authStorage
            setTokens({
                accessToken: payload.accessToken,
                refreshToken: payload.refreshToken,
                sessionToken: payload.sessionToken,
                sessionId: payload.sessionId,
                expiresIn: payload.expiresIn,
            });
            const user = payload.user;
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
            setDeviceMetadata(payload.deviceMetadata);
            setRememberMeStore(rememberMeValue);

            toast.success(t('login.welcomeBack', { name: payload.user.firstName }));
            // Return them to whatever they were trying to reach, if the
            // protected layout stashed it on the way out. The stored path is
            // locale-agnostic, so this router adds the right prefix.
            router.push(getAndClearRedirectUrl() ?? '/home');
            return true;
        },
        [router, setDeviceMetadata, setRememberMeStore, setTokens, setUser, t],
    );

    /* ============ Submit (email + password) ============ */
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
            };

            const { data } = await loginUser({ variables: { input } });

            // Password accepted; the emailed code is still needed. No session
            // exists yet — the code step below mints it.
            if (data?.login.requiresTwoFactor) {
                if (!data.login.twoFactorToken) {
                    setFormError(te('unavailable'));
                    return;
                }
                setPendingTwoFactor({ token: data.login.twoFactorToken, rememberMe });
                setTwoFactorCode('');
                setCodeError('');
                setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
                // The password has done its job; don't keep it in memory.
                setPassword('');
                return;
            }

            if (data?.login.success) {
                completeSignIn(data.login, rememberMe);
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

    /* ============ Two-factor code step ============ */
    const leaveTwoFactor = (message = '') => {
        setPendingTwoFactor(null);
        setTwoFactorCode('');
        setCodeError('');
        setResendSecondsLeft(0);
        setFormError(message);
    };

    const handleVerifyCode = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!pendingTwoFactor || verifyingCode) return;
        setCodeError('');

        const validation = validateTwoFactorCode(twoFactorCode);
        if (validation) {
            setCodeError(validation);
            return;
        }

        try {
            const { deviceMetadata } = useAuthStore.getState();
            const result = await completeTwoFactorLogin({
                variables: {
                    input: {
                        twoFactorToken: pendingTwoFactor.token,
                        code: twoFactorCode,
                        deviceId: deviceMetadata?.fingerprint || undefined,
                    },
                },
            });
            const payload = result.data?.completeTwoFactorLogin;
            if (payload?.success) {
                // On success we navigate away (the step unmounts with its token);
                // clearing it first would flash the password form.
                if (!completeSignIn(payload, pendingTwoFactor.rememberMe)) {
                    leaveTwoFactor('Access denied. Only local or diaspora users can sign in here.');
                }
                return;
            }

            const key = twoFactorErrorKey(payload?.error, result.error);
            if (endsTwoFactorSignIn(key)) {
                leaveTwoFactor(te('sessionExpired'));
                return;
            }
            if (key === 'codeExpired') setTwoFactorCode('');
            // Not a 2FA refusal: the account gate (suspended, banned, …) —
            // classified exactly like a password sign-in refusal.
            setCodeError(key ? te(key) : mapAuthError(payload?.error || payload?.message, t));
        } catch (error: any) {
            if (isNetworkError(error)) {
                toast.error(t('login.networkError'));
            } else {
                setCodeError(te('unavailable'));
            }
        }
    };

    const handleResendCode = async () => {
        if (!pendingTwoFactor || resendingCode || resendSecondsLeft > 0) return;
        setCodeError('');
        try {
            const result = await resendTwoFactorLoginCode({
                variables: { twoFactorToken: pendingTwoFactor.token },
            });
            const payload = result.data?.resendTwoFactorLoginCode;
            if (payload?.success) {
                setTwoFactorCode('');
                setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
                toast.success(t('twoFactor.codeResent'));
                return;
            }
            const key = twoFactorErrorKey(payload?.error, result.error) ?? 'unavailable';
            if (endsTwoFactorSignIn(key)) {
                leaveTwoFactor(te('sessionExpired'));
                return;
            }
            if (key === 'resendTooSoon') setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
            setCodeError(te(key));
        } catch (error: any) {
            if (isNetworkError(error)) {
                toast.error(t('login.networkError'));
            } else {
                setCodeError(te('unavailable'));
            }
        }
    };

    const emailTrimmed = email.trim();
    const emailFormatOk = isValidEmailFormat(emailTrimmed);
    const showEmailFormatError =
        shouldShowEmailFormatError(email) && !emailFormatOk;

    if (pendingTwoFactor) {
        return (
            <form className="space-y-6 lg:space-y-8" onSubmit={handleVerifyCode} noValidate data-testid="signin-two-factor">
                <div className="space-y-2">
                    <HeadingMedium>{t('twoFactor.title')}</HeadingMedium>
                    <BodyMedium>{t('twoFactor.description')}</BodyMedium>
                </div>

                <TwoFactorCodeField
                    id="signin-two-factor-code"
                    label={t('twoFactor.codeLabel')}
                    value={twoFactorCode}
                    onChange={(v) => {
                        setTwoFactorCode(v);
                        setCodeError('');
                    }}
                    disabled={verifyingCode}
                    errorMessage={codeError || undefined}
                    autoFocus
                    testId="signin-two-factor-code"
                />

                <div className="space-y-4">
                    <ButtonType2
                        type="submit"
                        disabled={verifyingCode}
                        className="px-8 py-3 bg-surface-brand rounded-full w-full cursor-pointer"
                    >
                        <span className="flex items-center justify-center gap-2">
                            {verifyingCode ? <Loader2 className="h-6 w-6 animate-spin" /> : t('twoFactor.verify')}
                        </span>
                    </ButtonType2>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={resendingCode || resendSecondsLeft > 0}
                            className="text-text-brand font-medium hover:underline disabled:opacity-60 disabled:no-underline"
                            data-testid="signin-two-factor-resend"
                        >
                            {resendSecondsLeft > 0
                                ? t('twoFactor.resendIn', { seconds: resendSecondsLeft })
                                : t('twoFactor.resend')}
                        </button>
                        <button
                            type="button"
                            onClick={() => leaveTwoFactor()}
                            className="text-text-secondary font-medium hover:underline"
                            data-testid="signin-two-factor-back"
                        >
                            {t('twoFactor.back')}
                        </button>
                    </div>
                </div>
            </form>
        );
    }

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