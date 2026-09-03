'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/components/utils';

type BannerVariant = 'error' | 'success' | 'info';

interface FormBannerProps {
    /** When falsy, the banner renders nothing. Pass state directly. */
    message?: string | null;
    variant?: BannerVariant;
    /** When provided, shows a dismiss button. */
    onDismiss?: () => void;
    className?: string;
}

const VARIANTS: Record<
    BannerVariant,
    { surface: string; border: string; text: string; Icon: React.ElementType }
> = {
    error: {
        surface: 'surface-danger',
        border: 'border-danger',
        text: 'text-danger',
        Icon: AlertCircle,
    },
    success: {
        surface: 'surface-success',
        border: 'border-success',
        text: 'text-success',
        Icon: CheckCircle2,
    },
    info: {
        surface: 'surface-info',
        border: 'border-info',
        text: 'text-info',
        Icon: Info,
    },
};

/**
 * Inline, persistent form-level message (NOT a toast). Use for credential and
 * server errors that the user must read and act on — e.g. "Invalid email or
 * password", "Email already registered", "Incorrect verification code".
 */
export const FormBanner: React.FC<FormBannerProps> = ({
    message,
    variant = 'error',
    onDismiss,
    className = '',
}) => {
    if (!message) return null;

    const { surface, border, text, Icon } = VARIANTS[variant];

    return (
        <div
            role="alert"
            aria-live={variant === 'error' ? 'assertive' : 'polite'}
            className={cn(
                'flex items-start gap-2.5 rounded-md border px-3 py-2.5',
                surface,
                border,
                text,
                className
            )}
        >
            <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="body-small flex-1">{message}</p>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            )}
        </div>
    );
};

export default FormBanner;
