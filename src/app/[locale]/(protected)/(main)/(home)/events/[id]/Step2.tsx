'use client';

import React from 'react';
import {
  CreditCard,
  Smartphone,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { ButtonType2, ButtonType3 } from '@/components/custom/button';
import { TextInput } from '@/components/custom/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { TextPrimary } from '@/components/utils';
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
  countryFlag: string;
  dialCode: string;

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
  countryFlag,
  dialCode,
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
  const t = useTranslations('home.events.payment');
  const tOnboarding = useTranslations('onboarding');
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
    <div className="w-full space-y-6 bg-surface-default">
      {/* ---------- Billing Information ---------- */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">{t('billingInformation')}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput
            label={tOnboarding('personalInfo.firstName.label')}
            placeholder={tOnboarding('personalInfo.firstName.placeholder')}
            value={firstName}
            onChange={onFirstNameChange}
            id="firstName"
          />
          <TextInput
            label={tOnboarding('personalInfo.lastName.label')}
            placeholder={tOnboarding('personalInfo.lastName.placeholder')}
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
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-text-primary">{t('payWith')}</h2>

        {/* ---- Credit Card (Stripe) ---- */}
        <div
          className={`rounded-xl border overflow-hidden transition-all ${
            localOpenMethod === 'card' ? 'border-border-brand' : 'border-border-subtle'
          }`}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer bg-surface-subtle hover:bg-surface-hover transition-colors"
            onClick={(e) => toggleMethod(e, 'card')}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-text-primary" />
              <span className="font-medium text-text-primary text-sm">{t('creditCard')}</span>
            </div>
            {localOpenMethod === 'card' ? null : <ChevronRight className="w-4 h-4 text-text-secondary" />}
          </div>

          {localOpenMethod === 'card' && (
            <div className="border-t p-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('cardNumber')}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <CreditCard className="w-4 h-4 text-text-secondary" />
                  </div>
                  <input
                    type="text"
                    placeholder={t('cardNumberPlaceholder')}
                    value={cardNumber}
                    onChange={(e) => onCardNumberChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-surface-subtle text-text-primary placeholder:text-text-secondary focus:border-border-brand focus:ring-0 outline-none text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label={t('expDate')}
                  placeholder={t('expDatePlaceholder')}
                  value={expDate}
                  onChange={onExpDateChange}
                  id="expDate"
                />
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t('cvv')}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder={t('cvvPlaceholder')}
                      value={cvv}
                      onChange={(e) => onCvvChange(e.target.value)}
                      maxLength={4}
                      className="w-full pr-10 pl-3 py-2.5 rounded-lg border bg-surface-subtle text-text-primary placeholder:text-text-secondary focus:border-border-brand focus:ring-0 outline-none text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <ButtonType3
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0 min-w-0 border-0 bg-transparent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HelpCircle className="w-4 h-4" />
                    </ButtonType3>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---- Mobile Money (Paystack) ---- */}
        <div
          className={`rounded-xl border overflow-hidden transition-all ${
            localOpenMethod === 'mobile' ? 'border-border-brand' : 'border-border-subtle'
          }`}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer bg-surface-subtle hover:bg-surface-hover transition-colors"
            onClick={(e) => toggleMethod(e, 'mobile')}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-text-primary" />
              <span className="font-medium text-text-primary text-sm">{t('mobilePayment')}</span>
            </div>
            {localOpenMethod === 'mobile' ? null : <ChevronRight className="w-4 h-4 text-text-secondary" />}
          </div>

          {localOpenMethod === 'mobile' && (
            <div className="border-t p-3 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'mtn', label: t('mobileProviders.mtn'), bg: 'bg-yellow-500' },
                  { id: 'telecel', label: t('mobileProviders.telecel'), bg: 'bg-red-600' },
                  { id: 'at', label: t('mobileProviders.at'), bg: 'bg-blue-600' },
                ].map((p) =>
                  mobileProvider === p.id ? (
                    <ButtonType2
                      key={p.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMobileProviderChange(p.id as MobileProvider);
                      }}
                      className="flex flex-col items-center p-2 rounded-xl border-2 border-border-brand shadow-sm"
                    >
                      <div className={`w-8 h-8 rounded-lg ${p.bg}`} />
                      <p className="mt-1.5 font-medium text-text-primary text-xs leading-tight text-center">
                        {p.label}
                      </p>
                    </ButtonType2>
                  ) : (
                    <ButtonType3
                      key={p.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMobileProviderChange(p.id as MobileProvider);
                      }}
                      className="flex flex-col items-center p-2 rounded-xl border-2 border-border-subtle"
                    >
                      <div className={`w-8 h-8 rounded-lg ${p.bg}`} />
                      <p className="mt-1.5 font-medium text-text-primary text-xs leading-tight text-center">
                        {p.label}
                      </p>
                    </ButtonType3>
                  )
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('phoneNumber')}
                </label>
                <InputGroup className="px-3 py-2 border border-border-default rounded-lg bg-surface-subtle focus-within:border-border-brand">
                  <InputGroupAddon>
                    <InputGroupText>
                      <span aria-hidden>{countryFlag}</span>
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupAddon>
                    <InputGroupText className="text-text-primary text-sm">
                      <TextPrimary>{dialCode}</TextPrimary>
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    value={phoneNumber}
                    onChange={(e) => onPhoneNumberChange(e.target.value)}
                    placeholder={t('phoneNumberPlaceholder')}
                    className="text-text-primary text-sm px-2 py-1 ml-2 focus:outline-none focus:ring-0 border-0 min-w-0"
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