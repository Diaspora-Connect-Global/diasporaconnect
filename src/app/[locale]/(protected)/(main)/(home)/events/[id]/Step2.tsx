'use client';

import React from 'react';
import { CreditCard, Smartphone, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Method = 'card' | 'mobile' | null;

interface Step2Props {
  openMethod: Method;
  onOpenMethodChange: (method: Method) => void;
}

export default function Step2({ openMethod, onOpenMethodChange }: Step2Props) {
  const t = useTranslations('home.events.payment');

  return (
    <div className="w-full space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">{t('payWith')}</h2>

      {/* Credit Card — Stripe */}
      <button
        type="button"
        onClick={() => onOpenMethodChange(openMethod === 'card' ? null : 'card')}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
          openMethod === 'card'
            ? 'border-border-brand bg-surface-brand/5'
            : 'border-border-subtle bg-surface-subtle hover:bg-surface-hover'
        }`}
      >
        <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
          openMethod === 'card' ? 'bg-surface-brand text-text-white' : 'bg-surface-default text-text-primary'
        }`}>
          <CreditCard className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary text-sm">{t('creditCard')}</p>
          <p className="text-xs text-text-secondary mt-0.5">Powered by Stripe · Your saved card will be charged</p>
        </div>
        {openMethod === 'card' && (
          <CheckCircle2 className="w-5 h-5 text-text-brand flex-shrink-0" />
        )}
      </button>

      {/* Mobile Money — Paystack */}
      <button
        type="button"
        onClick={() => onOpenMethodChange(openMethod === 'mobile' ? null : 'mobile')}
        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
          openMethod === 'mobile'
            ? 'border-border-brand bg-surface-brand/5'
            : 'border-border-subtle bg-surface-subtle hover:bg-surface-hover'
        }`}
      >
        <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
          openMethod === 'mobile' ? 'bg-surface-brand text-text-white' : 'bg-surface-default text-text-primary'
        }`}>
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary text-sm">{t('mobilePayment')}</p>
          <p className="text-xs text-text-secondary mt-0.5">Powered by Paystack · Complete in Paystack's secure popup</p>
        </div>
        {openMethod === 'mobile' && (
          <CheckCircle2 className="w-5 h-5 text-text-brand flex-shrink-0" />
        )}
      </button>

      {openMethod && (
        <p className="text-xs text-text-secondary px-1">
          {openMethod === 'card'
            ? 'Your primary Stripe card on file will be charged. To update your card, go to Settings → Payment Methods.'
            : 'After clicking Pay, a Paystack popup will open where you can enter your mobile number and authorise the payment.'}
        </p>
      )}
    </div>
  );
}
