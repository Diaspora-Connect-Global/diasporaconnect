"use client";

/**
 * Six-digit code field for two-factor authentication — the same slotted input
 * the password-reset flow uses, labelled, with its error announced.
 * Digits only; `one-time-code` lets mail/OS autofill offer the emailed code.
 */

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const SLOTS = [0, 1, 2, 3, 4, 5] as const;

interface TwoFactorCodeFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
    errorMessage?: string;
    autoFocus?: boolean;
    testId?: string;
}

export default function TwoFactorCodeField({
    id,
    label,
    value,
    onChange,
    onComplete,
    disabled = false,
    errorMessage,
    autoFocus = false,
    testId,
}: TwoFactorCodeFieldProps) {
    const errorId = errorMessage ? `${id}-error` : undefined;

    return (
        <div className="space-y-2">
            <label htmlFor={id} className="label-medium text-text-primary">
                {label}
            </label>
            <InputOTP
                id={id}
                maxLength={6}
                value={value}
                onChange={(next) => onChange(next.replace(/\D/g, ''))}
                onComplete={onComplete}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus={autoFocus}
                disabled={disabled}
                aria-invalid={errorMessage ? true : undefined}
                aria-describedby={errorId}
                data-testid={testId}
                containerClassName="w-full"
            >
                <InputOTPGroup className="w-full gap-2 text-text-primary body-large bg-surface-subtle">
                    {SLOTS.map((index) => (
                        <InputOTPSlot
                            key={index}
                            index={index}
                            className={`flex-1 h-12 text-lg rounded-md ${errorMessage ? 'border-danger' : ''}`}
                        />
                    ))}
                </InputOTPGroup>
            </InputOTP>
            {errorMessage && (
                <p id={errorId} role="alert" className="text-sm text-text-danger">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
