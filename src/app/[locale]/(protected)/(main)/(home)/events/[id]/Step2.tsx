'use client';

import React from 'react';
import {
  CreditCard,
  Smartphone,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { TextInput } from '@/components/custom/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { TextPrimary } from '@/components/utils';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

type Method = 'card' | 'mobile' | null;
type MobileProvider = 'mtn' | 'telecel' | 'at';

interface Step2Props {
  // Billing fields
  firstName: string;
  lastName: string;
  email: string;

  // Card fields
  cardNumber: string;
  expDate: string;
  cvv: string;

  // Mobile fields
  mobileProvider: MobileProvider;
  phoneNumber: string;

  // Payment method selection (accordion open state)
  openMethod: Method;
  onOpenMethodChange: (method: Method) => void;

  // Handlers
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onCardNumberChange: (v: string) => void;
  onExpDateChange: (v: string) => void;
  onCvvChange: (v: string) => void;
  onMobileProviderChange: (v: MobileProvider) => void;
  onPhoneNumberChange: (v: string) => void;
}

export default function Step2({
  firstName,
  lastName,
  email,
  cardNumber,
  expDate,
  cvv,
  mobileProvider,
  phoneNumber,
  openMethod,
  onOpenMethodChange,

  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onCardNumberChange,
  onExpDateChange,
  onCvvChange,
  onMobileProviderChange,
  onPhoneNumberChange,
}: Step2Props) {
  const t = useTranslations('onboarding');
  const tAuth = useTranslations('authentication');

  // Local UI state for accordion (syncs with parent)
  const [localOpenMethod, setLocalOpenMethod] = React.useState<Method>(openMethod);

  // Keep local state in sync with parent
  React.useEffect(() => {
    setLocalOpenMethod(openMethod);
  }, [openMethod]);

  const toggleMethod = (e: React.MouseEvent, method: Method) => {
    e.stopPropagation();
    const newMethod = localOpenMethod === method ? null : method;
    setLocalOpenMethod(newMethod);
    onOpenMethodChange(newMethod); // Lift to parent
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4">
      {/* ---------- Billing Information ---------- */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Billing information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label={t('personalInfo.firstName.label')}
            placeholder={t('personalInfo.firstName.placeholder')}
            value={firstName}
            onChange={onFirstNameChange}
            id="firstName"
          />
          <TextInput
            label={t('personalInfo.lastName.label')}
            placeholder={t('personalInfo.lastName.placeholder')}
            value={lastName}
            onChange={onLastNameChange}
            id="lastName"
          />
        </div>

        <TextInput
          type="email"
          label={tAuth('form.email.label')}
          placeholder={tAuth('form.email.placeholder')}
          value={email}
          onChange={onEmailChange}
          id="email"
        />
      </section>

      {/* ---------- Pay with ---------- */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">Pay with</h2>

        {/* ---- Credit Card ---- */}
        <div
          className={`
            rounded-xl border overflow-hidden transition-all
            ${localOpenMethod === 'card' ? 'border-border-brand' : 'border-border-subtle'}
          `}
        >
          <div
            className="flex items-center justify-between p-4 cursor-pointer bg-surface-subtle hover:bg-surface-hover transition-colors"
            onClick={(e) => toggleMethod(e, 'card')}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-700" />
              <span className="font-medium text-gray-900">Credit card</span>
            </div>
            {localOpenMethod === 'card' ? null : <ChevronRight className="w-5 h-5 text-gray-500" />}
          </div>

          {localOpenMethod === 'card' && (
            <div className="border-t p-6 space-y-5">
              {/* Card number */}
              <div>
                <label className="block font-label-medium text-gray-700 mb-1">
                  Card number
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <CreditCard className="w-5 h-5 text-text-secondary" />
                  </div>
                  <input
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => onCardNumberChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg border bg-surface-subtle text-text-primary placeholder-text-secondary focus:border-border-brand focus:ring-0 outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Exp date */}
                <TextInput
                  label="Exp. date"
                  placeholder="MM/YY"
                  value={expDate}
                  onChange={onExpDateChange}
                  id="expDate"
                />

                {/* CVV */}
                <div>
                  <label className="block font-label-medium text-text-primary mb-1">
                    CVV
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="***"
                      value={cvv}
                      onChange={(e) => onCvvChange(e.target.value)}
                      maxLength={4}
                      className="w-full pr-12 pl-4 py-3 rounded-lg border bg-surface-subtle text-gray-900 placeholder-gray-400 focus:border-border-brand focus:ring-0 outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HelpCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---- Mobile Payment ---- */}
        <div
          className={`
            rounded-xl border overflow-hidden transition-all
            ${localOpenMethod === 'mobile' ? 'border-border-brand' : 'border-border-subtle'}
          `}
        >
          <div
            className="flex items-center justify-between p-4 cursor-pointer bg-surface-subtle hover:bg-surface-hover transition-colors"
            onClick={(e) => toggleMethod(e, 'mobile')}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-700" />
              <span className="font-medium text-gray-900">Mobile payment</span>
            </div>
            {localOpenMethod === 'mobile' ? null : <ChevronRight className="w-5 h-5 text-text-primary" />}
          </div>

          {localOpenMethod === 'mobile' && (
            <div className="border-t p-6 space-y-6">
              {/* Providers */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'mtn', label: 'MTN MOMO', bg: 'bg-yellow-500' },
                  { id: 'telecel', label: 'TELECASH', bg: 'bg-red-600' },
                  { id: 'at', label: 'AT MONEY', bg: 'bg-blue-600' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMobileProviderChange(p.id as MobileProvider);
                    }}
                    className={`
                      flex flex-col items-center p-3 rounded-xl border-2 transition-all
                      ${mobileProvider === p.id ? 'border-border-brand shadow-sm' : 'border-border-subtle'}
                    `}
                  >
                    <div className={`w-10 h-10 rounded-lg ${p.bg}`} />
                    <p className="mt-2 font-medium text-text-primary text-xs leading-tight">
                      {p.label}
                    </p>
                  </button>
                ))}
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number
                </label>
                <InputGroup className="px-3 py-6 border border-border-default rounded-sm bg-surface-subtle focus-within:border-border-brand">
                  <InputGroupAddon>
                    <InputGroupText>
                      <Image src="/FLAG.png" alt="Ghana flag" width={15} height={15} />
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupAddon>
                    <InputGroupText className="text-text-primary">
                      <TextPrimary>+233</TextPrimary>
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    value={phoneNumber}
                    onChange={(e) => onPhoneNumberChange(e.target.value)}
                    placeholder="24 000 0000"
                    className="text-text-primary font-body-large px-3 py-6 ml-5 focus:outline-none focus:ring-0 border-0"
                    maxLength={10}
                  />
                </InputGroup>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}